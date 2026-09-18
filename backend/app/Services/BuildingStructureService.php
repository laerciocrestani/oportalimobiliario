<?php

namespace App\Services;

use App\Enums\FloorKind;
use App\Models\Building;
use App\Models\Tower;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @see REQ-WIZ-004
 * @see REQ-WZR-002
 * @see REQ-WZR-003
 */
class BuildingStructureService
{
    /**
     * @param  list<array{
     *     name: string,
     *     floors_count?: int,
     *     reference_floor?: int|null,
     *     floors?: list<array{number: int, kind: string|FloorKind}>
     * }>  $towers
     */
    public function replace(Building $building, array $towers): Building
    {
        if ($building->published || $building->wizard_completed_at !== null) {
            abort(409, 'Cannot replace structure of a published or completed building.');
        }

        $this->assertValidStructure($towers);

        DB::transaction(function () use ($building, $towers): void {
            $building->towers->each(function (Tower $tower): void {
                $tower->delete();
            });

            foreach ($towers as $index => $towerData) {
                $floors = $this->resolveFloors($towerData);
                $floorsCount = count(array_filter(
                    $floors,
                    fn (array $floor): bool => (int) $floor['number'] > 0,
                ));

                $tower = $building->towers()->create([
                    'name' => $towerData['name'],
                    'floors_count' => $floorsCount,
                    'reference_floor' => $towerData['reference_floor'] ?? null,
                    'sort_order' => $index,
                ]);

                foreach ($floors as $floorData) {
                    $tower->floors()->create([
                        'number' => $floorData['number'],
                        'kind' => $floorData['kind'] instanceof FloorKind
                            ? $floorData['kind']
                            : FloorKind::from($floorData['kind']),
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

    /**
     * @param  list<array{
     *     name: string,
     *     floors_count?: int,
     *     reference_floor?: int|null,
     *     floors?: list<array{number: int, kind: string|FloorKind}>
     * }>  $towers
     */
    private function assertValidStructure(array $towers): void
    {
        foreach ($towers as $towerIndex => $towerData) {
            if (! isset($towerData['floors'])) {
                continue;
            }

            $numbers = [];

            foreach ($towerData['floors'] as $floorIndex => $floorData) {
                $number = (int) $floorData['number'];
                $kind = $floorData['kind'] instanceof FloorKind
                    ? $floorData['kind']
                    : FloorKind::from((string) $floorData['kind']);

                if (isset($numbers[$number])) {
                    throw ValidationException::withMessages([
                        "towers.{$towerIndex}.floors.{$floorIndex}.number" => 'Floor numbers must be unique within a tower.',
                    ]);
                }

                $numbers[$number] = true;

                if ($kind === FloorKind::Garage && $number >= 0) {
                    throw ValidationException::withMessages([
                        "towers.{$towerIndex}.floors.{$floorIndex}.kind" => 'Garage floors must have a negative number.',
                    ]);
                }

                if ($number < 0 && $kind !== FloorKind::Garage) {
                    throw ValidationException::withMessages([
                        "towers.{$towerIndex}.floors.{$floorIndex}.kind" => 'Negative floors must be garage.',
                    ]);
                }
            }

            if (! array_key_exists('reference_floor', $towerData) || $towerData['reference_floor'] === null) {
                continue;
            }

            $referenceFloor = (int) $towerData['reference_floor'];

            if (! isset($numbers[$referenceFloor])) {
                throw ValidationException::withMessages([
                    "towers.{$towerIndex}.reference_floor" => 'Reference floor must exist in the tower.',
                ]);
            }
        }
    }

    /**
     * @param  array{
     *     name: string,
     *     floors_count?: int,
     *     floors?: list<array{number: int, kind: string|FloorKind}>
     * }  $towerData
     * @return list<array{number: int, kind: string|FloorKind}>
     */
    private function resolveFloors(array $towerData): array
    {
        if (isset($towerData['floors'])) {
            return $towerData['floors'];
        }

        $floors = [];

        for ($number = 1; $number <= (int) $towerData['floors_count']; $number++) {
            $floors[] = [
                'number' => $number,
                'kind' => FloorKind::Residential,
            ];
        }

        return $floors;
    }
}
