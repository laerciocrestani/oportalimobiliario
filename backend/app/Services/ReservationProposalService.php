<?php

namespace App\Services;

use App\Enums\ProposalDecision;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RTL-005
 * @see REQ-RTL-008
 * @see REQ-RTL-009
 * @see REQ-RTL-010
 * @see REQ-RTL-011
 */
class ReservationProposalService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function submit(User $broker, Reservation $reservation, array $data): Reservation
    {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if (! $reservation->canSubmitProposal()) {
            abort(422, 'Reservation is not open for proposal submission.');
        }

        if ($reservation->isPreHold() && $reservation->isExpired()) {
            abort(422, 'Sua pré-reserva expirou. A unidade está disponível novamente.');
        }

        return DB::transaction(function () use ($broker, $reservation, $data) {
            $version = (int) $reservation->proposals()->max('version') + 1;

            $proposal = $reservation->proposals()->create([
                'version' => $version,
                'client_name' => $data['client_name'],
                'client_email' => $data['client_email'],
                'client_phone' => $data['client_phone'],
                'client_cpf' => $data['client_cpf'],
                'address' => $data['address'],
                'city' => $data['city'],
                'state' => strtoupper((string) $data['state']),
                'zip' => $data['zip'],
                'marital_status' => $data['marital_status'],
                'nationality' => $data['nationality'],
                'land_value' => $data['land_value'],
                'payment_terms' => $data['payment_terms'],
                'submitted_by' => $broker->id,
            ]);

            $reservation->update([
                'status' => ReservationStatus::ProposalPending,
                'expires_at' => null,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ProposalSubmitted,
                $broker,
                ['proposal_id' => $proposal->id],
            );

            return $reservation->fresh(['unit', 'proposals']);
        });
    }

    public function decide(
        User $builder,
        Reservation $reservation,
        ProposalDecision $decision,
        ?string $decisionNote = null,
    ): Reservation {
        if (! $reservation->isProposalPending()) {
            abort(422, 'Reservation has no pending proposal.');
        }

        $proposal = $reservation->proposals()
            ->whereNull('decision')
            ->latest('version')
            ->first();

        if ($proposal === null) {
            abort(422, 'Pending proposal not found.');
        }

        return DB::transaction(function () use ($builder, $reservation, $proposal, $decision, $decisionNote) {
            $proposal->update([
                'decision' => $decision,
                'decision_note' => $decisionNote,
                'decided_by' => $builder->id,
                'decided_at' => now(),
            ]);

            return match ($decision) {
                ProposalDecision::Accepted => $this->accept($builder, $reservation, $proposal),
                ProposalDecision::Rejected => $this->reject($builder, $reservation, $proposal),
                ProposalDecision::Returned => $this->returnToBroker($builder, $reservation, $proposal),
            };
        });
    }

    private function accept(User $builder, Reservation $reservation, ReservationProposal $proposal): Reservation
    {
        $ttlHours = (int) config('opim.deposit_window_hours', 48);
        $client = $this->resolveClientFromProposal($reservation, $proposal);

        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->lockForUpdate()
            ->findOrFail($reservation->unit_id);

        if ($unit->status !== UnitStatus::PreReserved) {
            abort(422, 'Unidade não está mais disponível.');
        }

        $unit->update(['status' => UnitStatus::Reserved]);

        $reservation->update([
            'client_id' => $client->id,
            'status' => ReservationStatus::DepositPending,
            'expires_at' => now()->addHours($ttlHours),
        ]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalAccepted,
            $builder,
            ['proposal_id' => $proposal->id],
        );
        $this->timelineService->recordDepositWindowOpened($reservation);

        return $reservation->fresh(['unit', 'client', 'proposals']);
    }

    private function reject(User $builder, Reservation $reservation, ReservationProposal $proposal): Reservation
    {
        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->lockForUpdate()
            ->find($reservation->unit_id);

        if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
            $unit->update(['status' => UnitStatus::Available]);
        }

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalRejected,
            $builder,
            ['proposal_id' => $proposal->id, 'note' => $proposal->decision_note],
        );

        $reservation->update([
            'status' => ReservationStatus::Cancelled,
            'expires_at' => null,
        ]);

        return $reservation->fresh(['unit', 'proposals']);
    }

    private function returnToBroker(User $builder, Reservation $reservation, ReservationProposal $proposal): Reservation
    {
        $reservation->update(['status' => ReservationStatus::ProposalReturned]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalReturned,
            $builder,
            ['proposal_id' => $proposal->id, 'note' => $proposal->decision_note],
        );

        return $reservation->fresh(['unit', 'proposals']);
    }

    private function resolveClientFromProposal(Reservation $reservation, ReservationProposal $proposal): BrokerClient
    {
        $existing = BrokerClient::query()
            ->where('broker_id', $reservation->broker_id)
            ->where('email', $proposal->client_email)
            ->first();

        if ($existing !== null) {
            $existing->update([
                'name' => $proposal->client_name,
                'phone' => $proposal->client_phone,
            ]);

            return $existing;
        }

        return BrokerClient::query()->create([
            'broker_id' => $reservation->broker_id,
            'name' => $proposal->client_name,
            'phone' => $proposal->client_phone,
            'email' => $proposal->client_email,
        ]);
    }
}
