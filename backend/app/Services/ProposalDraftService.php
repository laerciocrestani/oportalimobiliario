<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RDP-001
 * @see REQ-RDP-002
 */
class ProposalDraftService
{
    public function __construct(
        private readonly ReservationGarageService $garageService,
    ) {}

    /**
     * @param  array{tenant_id: int}  $access
     * @param  list<int>  $garageUnitIds
     */
    public function create(User $broker, Unit $unit, array $access, array $garageUnitIds = []): Reservation
    {
        $ttlMinutes = (int) config('opim.proposal_draft_ttl_minutes', 20);
        $garageIds = $this->garageService->normalizeIds($garageUnitIds);

        return DB::transaction(function () use ($broker, $unit, $access, $ttlMinutes, $garageIds) {
            [$locked, $garages] = $this->garageService->lockPrimaryAndGarages($unit, $garageIds);

            if ($locked->status !== UnitStatus::Available) {
                abort(422, 'Esta unidade acaba de ser reservada por outro corretor.');
            }

            $locked->update(['status' => UnitStatus::PreReserved]);

            $reservation = Reservation::query()->create([
                'tenant_id' => $access['tenant_id'],
                'unit_id' => $locked->id,
                'broker_id' => $broker->id,
                'client_id' => null,
                'status' => ReservationStatus::ProposalDraft,
                'expires_at' => null,
                'draft_expires_at' => now()->addMinutes($ttlMinutes),
            ]);

            $this->garageService->attachLocked($reservation, $garages, UnitStatus::PreReserved);

            return $reservation->load(['unit', 'garageUnits']);
        });
    }

    public function expireDueDrafts(): int
    {
        $expired = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->where('status', ReservationStatus::ProposalDraft)
            ->whereNotNull('draft_expires_at')
            ->where('draft_expires_at', '<=', now())
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

                $this->garageService->detachAndRelease($reservation);

                $reservation->delete();
                $count++;
            });
        }

        return $count;
    }
}
