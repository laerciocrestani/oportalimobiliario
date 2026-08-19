<?php

namespace App\Services;

use App\Enums\FloorKind;
use App\Models\Building;
use App\Models\Tower;
use App\Support\AmenityPresentation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @see REQ-WIZ-005
 * @see REQ-WIZ-006
 * @see REQ-WIZ-007
 */
class BuildingUnitGridService
{
    /**
     * @param  list<array{id: int, floors: list<array{number: int, kind: string, units: list<array{code: string, area_m2?: float|int|string|null}>}>}>  $towers
     */
    public function replace(Building $building, array $towers): Building
    {
        if ($building->published || $building->wizard_completed_at !== null) {
            abort(409, 'Cannot replace unit grid of a published or completed building.');
        }

        DB::transaction(function () use ($building, $towers): void {
            $building->load(['towers.floors']);

            $this->assertCompleteGrid($building, $towers);

            $building->units()->delete();

            foreach ($towers as $towerData) {
                $tower = $building->towers->firstWhere('id', (int) $towerData['id']);

                if ($tower === null) {
                    continue;
                }

                foreach ($towerData['floors'] as $floorData) {
                    $number = (int) $floorData['number'];
                    $floor = $tower->floors->firstWhere('number', $number);

                    if ($floor === null) {
                        continue;
                    }

                    $floor->update([
                        'kind' => $floorData['kind'] instanceof FloorKind
                            ? $floorData['kind']
                            : FloorKind::from($floorData['kind']),
                    ]);

                    foreach ($floorData['units'] as $unitData) {
                        $area = $unitData['area_m2'] ?? null;

                        $building->units()->create([
                            'tower_id' => $tower->id,
                            'floor_id' => $floor->id,
                            'floor' => $number,
                            'code' => $unitData['code'],
                            'area_m2' => $area === '' ? null : $area,
                            'status' => 'available',
                        ]);
                    }
                }
            }

            $building->update(['wizard_step' => max((int) $building->wizard_step, 3)]);
        });

        $fresh = $building->fresh([
            'towers' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
            'towers.floors' => fn ($query) => $query->orderBy('number'),
            'towers.units' => fn ($query) => $query->orderByDesc('floor')->orderBy('code'),
            'units' => fn ($query) => $query->orderByDesc('floor')->orderBy('code'),
            ...AmenityPresentation::buildingEagerLoad(),
        ]) ?? $building;

        $fresh->setAttribute('units_summary', $fresh->computeUnitsSummary());
        $fresh->towers->each(function (Tower $tower): void {
            $tower->setAttribute('units_summary', $tower->computeUnitsSummary());
        });

        return $fresh;
    }

    /**
     * @param  list<array{id: int, floors: list<array{number: int, kind: string, units: list<array{code: string, area_m2?: float|int|string|null}>}>}>  $towers
     */
    private function assertCompleteGrid(Building $building, array $towers): void
    {
        $seenTowerIds = [];

        foreach ($towers as $towerData) {
            $towerId = (int) $towerData['id'];

            if (in_array($towerId, $seenTowerIds, true)) {
                throw ValidationException::withMessages([
                    'towers' => 'Each tower may appear only once in the unit grid.',
                ]);
            }

            $seenTowerIds[] = $towerId;

            $tower = $building->towers->firstWhere('id', $towerId);

            if ($tower === null) {
                throw ValidationException::withMessages([
                    'towers' => 'Tower does not belong to this building.',
                ]);
            }

            $payloadNumbers = collect($towerData['floors'])
                ->map(fn (array $floor): int => (int) $floor['number'])
                ->sort()
                ->values()
                ->all();
            $expectedNumbers = $tower->floors
                ->pluck('number')
                ->map(fn (mixed $number): int => (int) $number)
                ->sort()
                ->values()
                ->all();

            if ($payloadNumbers !== $expectedNumbers) {
                throw ValidationException::withMessages([
                    'towers' => 'Unit grid must include every floor of each tower.',
                ]);
            }

            $codes = collect($towerData['floors'])
                ->flatMap(fn (array $floor) => collect($floor['units'])->pluck('code'))
                ->map(fn (mixed $code): string => (string) $code);

            if ($codes->count() !== $codes->unique()->count()) {
                throw ValidationException::withMessages([
                    'towers' => 'Unit codes must be unique within a tower.',
                ]);
            }
        }

        $missingTowers = $building->towers->pluck('id')->diff($seenTowerIds);

        if ($missingTowers->isNotEmpty()) {
            throw ValidationException::withMessages([
                'towers' => 'Unit grid must include every tower of the building.',
            ]);
        }
    }
}
