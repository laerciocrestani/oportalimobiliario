<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RES-005
 * @see REQ-RES-006
 * @see REQ-RES-007
 */
class PreReservationService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}
    /**
     * @param  array{tenant_id: int}  $access
     */
    public function createPreHold(User $broker, Unit $unit, array $access): Reservation
    {
        $ttlMinutes = (int) config('opim.pre_reservation_ttl_minutes', 10);

        $reservation = DB::transaction(function () use ($broker, $unit, $access, $ttlMinutes) {
            $locked = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($unit->id);

            if ($locked->status !== UnitStatus::Available) {
                abort(422, 'Esta unidade acaba de ser pré-reservada por outro corretor.');
            }

            $locked->update(['status' => UnitStatus::PreReserved]);

            return Reservation::query()->create([
                'tenant_id' => $access['tenant_id'],
                'unit_id' => $locked->id,
                'broker_id' => $broker->id,
                'client_id' => null,
                'status' => ReservationStatus::PreHold,
                'expires_at' => now()->addMinutes($ttlMinutes),
            ]);
        });

        $this->timelineService->recordPreHoldCreated($reservation, $broker);

        return $reservation;
    }

    public function confirmPreHold(
        User $broker,
        Reservation $reservation,
        BrokerClient $client,
        ?string $observations = null,
    ): Reservation {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if ($reservation->status !== ReservationStatus::PreHold) {
            abort(422, 'Reservation is not a pre-hold.');
        }

        if ($reservation->isExpired()) {
            abort(422, 'Sua pré-reserva expirou. A unidade está disponível novamente.');
        }

        $ttlHours = (int) config('opim.reservation_ttl_hours', 48);
        $observationsText = trim((string) $observations);

        $reservation = DB::transaction(function () use ($reservation, $client, $observationsText, $ttlHours) {
            $locked = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            if ($locked->status !== UnitStatus::PreReserved) {
                abort(422, 'Unidade não está mais disponível.');
            }

            $locked->update(['status' => UnitStatus::Reserved]);

            $reservation->update([
                'client_id' => $client->id,
                'status' => ReservationStatus::Confirmed,
                'expires_at' => now()->addHours($ttlHours),
            ]);

            if ($observationsText !== '') {
                $reservation->messages()->create([
                    'user_id' => $reservation->broker_id,
                    'body' => $observationsText,
                ]);
            }

            return $reservation->fresh(['unit', 'client']);
        });

        $this->timelineService->recordDepositWindowOpened($reservation);

        if ($observationsText !== '') {
            $this->timelineService->recordDialogue($reservation, $broker);
        }

        return $reservation;
    }

    public function releasePreHold(User $broker, Reservation $reservation): void
    {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if ($reservation->status !== ReservationStatus::PreHold) {
            abort(422, 'Reservation is not a pre-hold.');
        }

        DB::transaction(function () use ($reservation) {
            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->find($reservation->unit_id);

            if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
                $unit->update(['status' => UnitStatus::Available]);
            }

            $reservation->delete();
        });
    }

    public function expireDuePreHolds(): int
    {
        $expired = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->where('status', ReservationStatus::PreHold)
            ->where('expires_at', '<=', now())
            ->get();

        $count = 0;

        foreach ($expired as $reservation) {
            DB::transaction(function () use ($reservation, &$count) {
                $unit = Unit::query()
                    ->withoutGlobalScope('tenant')
                    ->lockForUpdate()
                    ->find($reservation->unit_id);

                if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
                    $unit->update(['status' => UnitStatus::Available]);
                }

                $reservation->delete();
                $count++;
            });
        }

        return $count;
    }
}
