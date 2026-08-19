<?php

namespace App\Services;

use App\Enums\FloorKind;
use App\Models\Building;
use App\Models\Tower;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-WIZ-004
 */
class BuildingStructureService
{
    /**
     * @param  list<array{name: string, floors_count: int}>  $towers
     */
    public function replace(Building $building, array $towers): Building
    {
        if ($building->published || $building->wizard_completed_at !== null) {
            abort(409, 'Cannot replace structure of a published or completed building.');
        }

        DB::transaction(function () use ($building, $towers): void {
            $building->towers->each(function (Tower $tower): void {
                $tower->delete();
            });

            foreach ($towers as $index => $towerData) {
                $tower = $building->towers()->create([
                    'name' => $towerData['name'],
                    'floors_count' => $towerData['floors_count'],
                    'sort_order' => $index,
                ]);

                for ($number = 1; $number <= $towerData['floors_count']; $number++) {
                    $tower->floors()->create([
                        'number' => $number,
                        'kind' => FloorKind::Residential,
                    ]);
                }
            }

            $wizardStep = max((int) $building->wizard_step, 2);
            $building->update(['wizard_step' => $wizardStep]);
        });

        return $building->fresh([
            'towers' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
            'towers.floors' => fn ($query) => $query->orderBy('number'),
        ]) ?? $building;
    }
}
