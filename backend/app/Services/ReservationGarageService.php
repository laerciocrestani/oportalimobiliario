<?php

namespace App\Services;

use App\Enums\FloorKind;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use Illuminate\Support\Collection;

/**
 * @see REQ-RGS-001
 * @see REQ-RGS-003
 * @see REQ-RGS-004
 */
class ReservationGarageService
{
    /**
     * Validate garage IDs against the primary unit (no locks). Call before locking.
     *
     * @param  list<int>  $garageUnitIds
     * @return list<int>
     */
    public function normalizeIds(array $garageUnitIds): array
    {
        return collect($garageUnitIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * Lock primary + garage units in id order. Call inside a DB transaction.
     *
     * @param  list<int>  $garageUnitIds
     * @return array{0: Unit, 1: Collection<int, Unit>}
     */
    public function lockPrimaryAndGarages(Unit $primaryUnit, array $garageUnitIds): array
    {
        $garageIds = $this->normalizeIds($garageUnitIds);

        if ($primaryUnit->relationLoaded('floorRecord') === false) {
            $primaryUnit->load('floorRecord');
        }

        if ($primaryUnit->isGarage()) {
            abort(422, 'A unidade principal da reserva não pode ser uma vaga de garagem.');
        }

        $allIds = collect([$primaryUnit->id, ...$garageIds])->unique()->sort()->values()->all();

        /** @var Collection<int, Unit> $locked */
        $locked = Unit::query()
            ->withoutGlobalScope('tenant')
            ->with('floorRecord')
            ->whereIn('id', $allIds)
            ->lockForUpdate()
            ->orderBy('id')
            ->get()
            ->keyBy('id');

        $primary = $locked->get($primaryUnit->id);

        if ($primary === null) {
            abort(422, 'Unidade não encontrada.');
        }

        $garages = collect();

        foreach ($garageIds as $id) {
            $garage = $locked->get($id);

            if ($garage === null) {
                abort(422, 'Uma ou mais vagas de garagem não foram encontradas.');
            }

            if ((int) $id === (int) $primary->id) {
                abort(422, 'A unidade principal não pode ser listada como vaga.');
            }

            if (! $garage->isGarage()) {
                abort(422, 'Somente unidades de garagem podem ser atreladas como vaga.');
            }

            if ((int) $garage->building_id !== (int) $primary->building_id) {
                abort(422, 'As vagas devem pertencer ao mesmo empreendimento da unidade.');
            }

            if ($garage->status !== UnitStatus::Available) {
                abort(422, 'Esta unidade acaba de ser pré-reservada por outro corretor.');
            }

            $garages->push($garage);
        }

        return [$primary, $garages];
    }

    /**
     * Persist pivot and set garage status to match the reservation hold.
     *
     * @param  Collection<int, Unit>  $garages
     */
    public function attachLocked(Reservation $reservation, Collection $garages, UnitStatus $status): void
    {
        foreach ($garages as $garage) {
            $garage->update(['status' => $status]);
            $reservation->garageUnits()->attach($garage->id, [
                'tenant_id' => $reservation->tenant_id,
            ]);
        }
    }

    public function syncStatus(Reservation $reservation, UnitStatus $status): void
    {
        $reservation->loadMissing('garageUnits');

        $ids = $reservation->garageUnits->pluck('id')->sort()->values()->all();

        if ($ids === []) {
            return;
        }

        $locked = Unit::query()
            ->withoutGlobalScope('tenant')
            ->whereIn('id', $ids)
            ->lockForUpdate()
            ->orderBy('id')
            ->get();

        foreach ($locked as $garage) {
            $garage->update(['status' => $status]);
        }
    }

    /**
     * Set garage units back to available and detach pivot rows.
     */
    public function detachAndRelease(Reservation $reservation): void
    {
        $reservation->loadMissing('garageUnits');

        $ids = $reservation->garageUnits->pluck('id')->sort()->values()->all();

        if ($ids !== []) {
            $locked = Unit::query()
                ->withoutGlobalScope('tenant')
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            foreach ($locked as $garage) {
                if ($garage->status !== UnitStatus::Sold) {
                    $garage->update(['status' => UnitStatus::Available]);
                }
            }
        }

        $reservation->garageUnits()->detach();
    }

    /**
     * @return list<array{id: int, code: string, price: mixed, status: string, private_area_m2: mixed, floor_kind: string}>
     */
    public static function serializeGarageUnits(Reservation $reservation): array
    {
        $reservation->loadMissing('garageUnits.floorRecord');

        return $reservation->garageUnits
            ->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'code' => $unit->code,
                'price' => $unit->price,
                'status' => $unit->status instanceof UnitStatus ? $unit->status->value : (string) $unit->status,
                'private_area_m2' => $unit->private_area_m2,
                'floor_kind' => FloorKind::Garage->value,
            ])
            ->values()
            ->all();
    }
}
