<?php

namespace App\Services;

use App\Enums\FloorKind;
use App\Models\Floor;
use App\Models\Tower;
use App\Models\Unit;

class UnitFloorBackfill
{
    public function run(): int
    {
        $updated = 0;

        Unit::query()
            ->whereNull('floor_id')
            ->whereNotNull('floor')
            ->whereNotNull('tower_id')
            ->orderBy('id')
            ->each(function (Unit $unit) use (&$updated): void {
                if ($this->attachFloor($unit)) {
                    $updated++;
                }
            });

        return $updated;
    }

    public function attachFloor(Unit $unit): bool
    {
        if ($unit->tower_id === null || $unit->floor === null) {
            return false;
        }

        $floor = Floor::query()->firstOrCreate(
            [
                'tower_id' => $unit->tower_id,
                'number' => $unit->floor,
            ],
            [
                'tenant_id' => $unit->tenant_id,
                'kind' => FloorKind::Residential,
            ],
        );

        if ($unit->floor_id === $floor->id) {
            return false;
        }

        $unit->forceFill(['floor_id' => $floor->id])->save();
        $this->syncTowerFloorsCount($unit->tower);

        return true;
    }

    private function syncTowerFloorsCount(?Tower $tower): void
    {
        if ($tower === null) {
            return;
        }

        $count = $tower->floors()->count();

        if ((int) $tower->floors_count !== $count) {
            $tower->forceFill(['floors_count' => $count])->save();
        }
    }
}
