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
 * @see REQ-WIZ-008
 * @see REQ-WIZ-009
 */
class BuildingUnitGridService
{
    public function __construct(private AmenityAssignmentService $amenities) {}

    /**
     * @param  list<array<string, mixed>>  $towers
     */
    public function replace(Building $building, array $towers): Building
    {
        if ($building->published || $building->wizard_completed_at !== null) {
            abort(409, 'Cannot replace unit grid of a published or completed building.');
        }

        DB::transaction(function () use ($building, $towers): void {
            $building->load(['towers.floors', 'amenities']);

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
                        $unit = $building->units()->create(
                            $this->unitAttributes($unitData, $tower->id, $floor->id, $number),
                        );

                        if (array_key_exists('amenity_ids', $unitData)) {
                            $this->amenities->syncUnitExtras($unit, $unitData['amenity_ids'] ?? []);
                        }
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
     * @param  array<string, mixed>  $unitData
     * @return array<string, mixed>
     */
    private function unitAttributes(array $unitData, int $towerId, int $floorId, int $number): array
    {
        $area = $this->blankToNull($unitData['area_m2'] ?? null);
        $private = $this->blankToNull($unitData['private_area_m2'] ?? null) ?? $area;
        $price = $this->blankToNull($unitData['price'] ?? null);
        $priceBase = $this->blankToNull($unitData['price_base'] ?? null) ?? $price;

        return [
            'tower_id' => $towerId,
            'floor_id' => $floorId,
            'floor' => $number,
            'code' => $unitData['code'],
            'area_m2' => $private,
            'private_area_m2' => $private,
            'total_area_m2' => $this->blankToNull($unitData['total_area_m2'] ?? null),
            'bedrooms' => $this->nullableInt($unitData['bedrooms'] ?? null),
            'bathrooms' => $this->nullableInt($unitData['bathrooms'] ?? null),
            'suites' => $this->nullableInt($unitData['suites'] ?? null),
            'powder_rooms' => $this->nullableInt($unitData['powder_rooms'] ?? null),
            'balconies' => $this->nullableInt($unitData['balconies'] ?? null),
            'price' => $priceBase,
            'price_base' => $priceBase,
            'price_competence' => $this->blankToNull($unitData['price_competence'] ?? null),
            'property_position' => $this->blankToNull($unitData['property_position'] ?? null),
            'solar_position' => $this->blankToNull($unitData['solar_position'] ?? null),
            'sun_period' => $this->blankToNull($unitData['sun_period'] ?? null),
            'ceiling_type' => $this->blankToNull($unitData['ceiling_type'] ?? null),
            'opening_type' => $this->blankToNull($unitData['opening_type'] ?? null),
            'flooring_type' => $this->blankToNull($unitData['flooring_type'] ?? null),
            'status' => 'available',
        ];
    }

    private function blankToNull(mixed $value): mixed
    {
        return $value === '' ? null : $value;
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    /**
     * @param  list<array<string, mixed>>  $towers
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
