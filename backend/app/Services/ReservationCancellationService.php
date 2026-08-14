<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReservationCancellationService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}

    public function cancel(User $actor, Reservation $reservation, string $reason): void
    {
        $reason = trim($reason);

        if ($reason === '') {
            abort(422, 'Informe o motivo do cancelamento.');
        }

        if ($reservation->isCancelled()) {
            abort(422, 'Reservation cannot be cancelled.');
        }

        DB::transaction(function () use ($actor, $reservation, $reason) {
            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            if ($unit->status !== UnitStatus::Sold) {
                $unit->update(['status' => UnitStatus::Available]);
            }

            $reservation->update(['status' => ReservationStatus::Cancelled]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::Cancelled,
                $actor,
                ['reason' => $reason],
            );
        });
    }
}
