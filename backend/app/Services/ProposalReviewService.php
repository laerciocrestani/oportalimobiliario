<?php

namespace App\Services;

use App\Enums\ProposalDecision;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\User;
use App\Support\BusinessClock;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RDP-004
 * @see REQ-RDP-005
 */
class ProposalReviewService
{
    public function __construct(
        private readonly BusinessClock $businessClock,
        private readonly ReservationGarageService $garageService,
        private readonly ReservationTimelineService $timelineService,
    ) {}

    public function extend(User $builder, Reservation $reservation, int $hours): Reservation
    {
        if (! $reservation->isProposalPending() || $reservation->review_deadline_at === null) {
            abort(422, 'Não há proposta em análise para prorrogar.');
        }

        $deadline = $this->businessClock->addHours($reservation->review_deadline_at, $hours);

        $reservation->update([
            'review_deadline_at' => $deadline,
        ]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::HoldExtended,
            $builder,
            [
                'hours' => $hours,
                'scope' => 'proposal_review',
                'review_deadline_at' => $deadline->toIso8601String(),
            ],
        );

        return $reservation->fresh();
    }

    public function expireDueReviews(): int
    {
        $due = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->where('status', ReservationStatus::ProposalPending)
            ->whereNotNull('review_deadline_at')
            ->where('review_deadline_at', '<=', now())
            ->get();

        $count = 0;

        foreach ($due as $reservation) {
            $expired = DB::transaction(function () use ($reservation): bool {
                $locked = Reservation::query()
                    ->withoutGlobalScope('tenant')
                    ->lockForUpdate()
                    ->find($reservation->id);

                if ($locked === null || ! $locked->isProposalPending()) {
                    return false;
                }

                if ($locked->review_deadline_at === null || $locked->review_deadline_at->isFuture()) {
                    return false;
                }

                $unit = Unit::query()
                    ->withoutGlobalScope('tenant')
                    ->lockForUpdate()
                    ->find($locked->unit_id);

                if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
                    $unit->update(['status' => UnitStatus::Available]);
                }

                $this->garageService->detachAndRelease($locked);

                $locked->proposals()->whereNull('decision')->update([
                    'decision' => ProposalDecision::Rejected,
                    'decision_note' => 'Prazo de análise encerrado sem decisão.',
                    'decided_at' => now(),
                ]);

                $this->timelineService->record(
                    $locked,
                    ReservationTimelineEventType::ProposalRejected,
                    null,
                    ['note' => 'Prazo de análise encerrado sem decisão.'],
                );

                $locked->update([
                    'status' => ReservationStatus::Cancelled,
                    'expires_at' => null,
                ]);

                return true;
            });

            if ($expired) {
                $count++;
            }
        }

        return $count;
    }
}
