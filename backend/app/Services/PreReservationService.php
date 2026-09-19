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
 * @see REQ-RGS-002
 * @see REQ-RGS-004
 */
class PreReservationService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
        private readonly UserActivityCatalog $activityCatalog,
        private readonly ReservationHoldService $holdService,
        private readonly ReservationGarageService $garageService,
    ) {}

    /**
     * @param  array{tenant_id: int}  $access
     * @param  list<int>  $garageUnitIds
     */
    public function createPreHold(User $broker, Unit $unit, array $access, array $garageUnitIds = []): Reservation
    {
        $ttlMinutes = (int) config('opim.pre_reservation_ttl_minutes', 10);
        $garageIds = $this->garageService->normalizeIds($garageUnitIds);

        $reservation = DB::transaction(function () use ($broker, $unit, $access, $ttlMinutes, $garageIds) {
            [$locked, $garages] = $this->garageService->lockPrimaryAndGarages($unit, $garageIds);

            if ($locked->status !== UnitStatus::Available) {
                abort(422, 'Esta unidade acaba de ser pré-reservada por outro corretor.');
            }

            $locked->update(['status' => UnitStatus::PreReserved]);

            $reservation = Reservation::query()->create([
                'tenant_id' => $access['tenant_id'],
                'unit_id' => $locked->id,
                'broker_id' => $broker->id,
                'client_id' => null,
                'status' => ReservationStatus::PreHold,
                'expires_at' => now()->addMinutes($ttlMinutes),
            ]);

            $this->garageService->attachLocked($reservation, $garages, UnitStatus::PreReserved);

            return $reservation;
        });

        $this->timelineService->recordPreHoldCreated($reservation, $broker);

        return $reservation->load(['unit', 'garageUnits']);
    }

    public function attachClient(
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

        $observationsText = trim((string) $observations);

        $reservation = DB::transaction(function () use ($reservation, $client, $observationsText) {
            $locked = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            if ($locked->status !== UnitStatus::PreReserved) {
                abort(422, 'Unidade não está mais disponível.');
            }

            $holdHours = (int) config('opim.pre_reservation_hold_hours', 48);

            $reservation->update([
                'client_id' => $client->id,
                'expires_at' => now()->addHours($holdHours),
            ]);

            if ($observationsText !== '') {
                $reservation->messages()->create([
                    'user_id' => $reservation->broker_id,
                    'body' => $observationsText,
                ]);
            }

            return $reservation->fresh(['unit', 'client', 'garageUnits']);
        });

        $this->activityCatalog->recordPreHoldConfirmed($broker, $reservation);

        if ($observationsText !== '') {
            $this->timelineService->recordDialogue($reservation, $broker);
            $this->activityCatalog->recordMessageSent($broker, $reservation, $observationsText);
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

        DB::transaction(function () use ($broker, $reservation) {
            $reservation->loadMissing('unit');
            $this->activityCatalog->recordPreHoldCancelled($broker, $reservation);

            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->find($reservation->unit_id);

            if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
                $unit->update(['status' => UnitStatus::Available]);
            }

            $this->garageService->detachAndRelease($reservation);

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
            if ($reservation->client_id !== null) {
                $this->holdService->expireStalled($reservation);
                $count++;

                continue;
            }

            DB::transaction(function () use ($reservation, &$count) {
                $unit = Unit::query()
                    ->withoutGlobalScope('tenant')
                    ->lockForUpdate()
                    ->find($reservation->unit_id);

                if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
                    $unit->update(['status' => UnitStatus::Available]);
                }

                $this->garageService->detachAndRelease($reservation);

                $reservation->delete();
                $count++;
            });
        }

        return $count;
    }
}
