<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RPF-006
 * @see REQ-RPF-007
 * @see REQ-RPF-003
 */
class ReservationHoldService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
        private readonly ReservationCancellationService $cancellationService,
        private readonly ReservationGarageService $garageService,
    ) {}

    public function extend(User $builder, Reservation $reservation, int $hours = 48): Reservation
    {
        if (! $reservation->hasClientHold()) {
            abort(422, 'Só é possível estender o prazo de uma pré-reserva com cliente.');
        }

        if ($hours < 1 || $hours > 168) {
            abort(422, 'Informe um prazo entre 1 e 168 horas.');
        }

        $base = $reservation->expires_at !== null && $reservation->expires_at->isFuture()
            ? $reservation->expires_at->copy()
            : now();

        $expiresAt = $base->addHours($hours);

        $reservation->update(['expires_at' => $expiresAt]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::HoldExtended,
            $builder,
            [
                'hours' => $hours,
                'expires_at' => $expiresAt->toIso8601String(),
            ],
        );

        return $reservation->fresh(['unit', 'client']);
    }

    public function drop(User $builder, Reservation $reservation, ?string $reason = null): void
    {
        if (! $reservation->hasClientHold()) {
            abort(422, 'Só é possível encerrar uma pré-reserva com cliente.');
        }

        $note = trim((string) $reason);
        $this->cancellationService->cancel(
            $builder,
            $reservation,
            $note !== '' ? $note : 'Pré-reserva encerrada pelo gestor.',
        );
    }

    public function expireStalled(Reservation $reservation): void
    {
        DB::transaction(function () use ($reservation): void {
            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->find($reservation->unit_id);

            if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
                $unit->update(['status' => UnitStatus::Available]);
            }

            $this->garageService->detachAndRelease($reservation);

            $reservation->update(['status' => ReservationStatus::Cancelled]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::Expired,
                payload: ['reason' => 'Pré-reserva expirada sem sinal nem avanço.'],
            );
        });
    }
}
