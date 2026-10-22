<?php

namespace App\Services;

use App\Enums\FloorKind;
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\Floor;
use App\Models\Tower;
use App\Models\Unit;
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
     *     id?: string|null,
     *     floors_count?: int,
     *     reference_floor?: int|null,
     *     floors?: list<array{number: int, kind: string|FloorKind}>
     * }>  $towers
     */
    public function replace(Building $building, array $towers): Building
    {
        $this->assertValidStructure($towers);

        DB::transaction(function () use ($building, $towers): void {
            $building->load(['towers.floors', 'towers.units.reservation']);
            $kept = [];

            foreach ($towers as $index => $towerData) {
                $floors = $this->resolveFloors($towerData);
                $existing = $this->matchingTower($building, $towerData);

                if ($existing === null) {
                    $tower = $building->towers()->create($this->towerAttributes($towerData, $floors, $index));

                    foreach ($floors as $floorData) {
                        $tower->floors()->create($this->floorAttributes($floorData));
                    }

                    $kept[] = (string) $tower->id;

                    continue;
                }

                $this->assertLockedFloorsKept($existing, $floors);
                $existing->update($this->towerAttributes($towerData, $floors, $index));
                $this->syncFloors($existing, $floors);
                $kept[] = (string) $existing->id;
            }

            foreach ($building->towers as $tower) {
                if (in_array((string) $tower->id, $kept, true)) {
                    continue;
                }

                if ($this->towerHasReference($tower)) {
                    throw ValidationException::withMessages([
                        'towers' => 'Não é possível remover a torre enquanto houver unidade em venda ou vendida.',
                    ]);
                }

                $tower->delete();
            }

            $building->update(['wizard_step' => max((int) $building->wizard_step, 2)]);
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

    /**
     * @param  array{id?: string|null, name: string, reference_floor?: int|null}  $towerData
     */
    private function matchingTower(Building $building, array $towerData): ?Tower
    {
        $id = $towerData['id'] ?? null;

        if ($id === null || $id === '') {
            return null;
        }

        $tower = $building->towers->firstWhere('id', (string) $id);

        if ($tower === null) {
            throw ValidationException::withMessages([
                'towers' => 'Tower does not belong to this building.',
            ]);
        }

        return $tower;
    }

    /**
     * @param  array{name: string, reference_floor?: int|null}  $towerData
     * @param  list<array{number: int, kind: string|FloorKind}>  $floors
     * @return array{name: string, floors_count: int, reference_floor: int|null, sort_order: int}
     */
    private function towerAttributes(array $towerData, array $floors, int $index): array
    {
        return [
            'name' => $towerData['name'],
            'floors_count' => count(array_filter(
                $floors,
                fn (array $floor): bool => (int) $floor['number'] > 0,
            )),
            'reference_floor' => $towerData['reference_floor'] ?? null,
            'sort_order' => $index,
        ];
    }

    /**
     * @param  array{number: int, kind: string|FloorKind}  $floorData
     * @return array{number: int, kind: FloorKind}
     */
    private function floorAttributes(array $floorData): array
    {
        return [
            'number' => (int) $floorData['number'],
            'kind' => $floorData['kind'] instanceof FloorKind
                ? $floorData['kind']
                : FloorKind::from($floorData['kind']),
        ];
    }

    /**
     * @param  list<array{number: int, kind: string|FloorKind}>  $floors
     */
    private function assertLockedFloorsKept(Tower $tower, array $floors): void
    {
        $incoming = [];

        foreach ($floors as $floor) {
            $incoming[(int) $floor['number']] = true;
        }

        foreach ($tower->units as $unit) {
            if (! $this->unitIsReferenced($unit)) {
                continue;
            }

            if (! isset($incoming[(int) $unit->floor])) {
                throw ValidationException::withMessages([
                    'towers' => "A unidade {$unit->code} está em venda ou vendida e não pode ser alterada.",
                ]);
            }
        }
    }

    /**
     * @param  list<array{number: int, kind: string|FloorKind}>  $floors
     */
    private function syncFloors(Tower $tower, array $floors): void
    {
        $existing = $tower->floors->keyBy(fn (Floor $floor): int => (int) $floor->number);
        $incoming = [];

        foreach ($floors as $floorData) {
            $attributes = $this->floorAttributes($floorData);
            $incoming[$attributes['number']] = true;
            $current = $existing->get($attributes['number']);

            if ($current instanceof Floor) {
                $current->update(['kind' => $attributes['kind']]);

                continue;
            }

            $tower->floors()->create($attributes);
        }

        foreach ($existing as $number => $floor) {
            if (! isset($incoming[(int) $number])) {
                $floor->delete();
            }
        }
    }

    private function towerHasReference(Tower $tower): bool
    {
        return $tower->units->contains(fn (Unit $unit): bool => $this->unitIsReferenced($unit));
    }

    private function unitIsReferenced(Unit $unit): bool
    {
        if ($unit->status === UnitStatus::Sold) {
            return true;
        }

        return $unit->reservation !== null;
    }
}
