<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Unit;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Syncs amenity pivots without copying building amenities onto units.
 *
 * @see REQ-WIZ-009
 */
class AmenityAssignmentService
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'amenity_ids' => ['sometimes', 'array'],
            'amenity_ids.*' => ['integer', Rule::exists('amenities', 'id')->where('active', true)],
        ];
    }

    /**
     * @param  list<int|string>  $amenityIds
     */
    public function syncBuilding(Building $building, array $amenityIds): void
    {
        $ids = $this->activeIds($amenityIds);

        $building->amenities()->sync($ids->all());

        $this->pruneUnitDuplicates($building, $ids);
    }

    /**
     * Stores only extras. IDs already on the building are ignored (not 422).
     *
     * @param  list<int|string>  $amenityIds
     */
    public function syncUnitExtras(Unit $unit, array $amenityIds): void
    {
        $unit->loadMissing('building.amenities');

        $buildingIds = $unit->building?->amenities->pluck('id') ?? collect();
        $extras = $this->activeIds($amenityIds)->diff($buildingIds)->values();

        $unit->amenities()->sync($extras->all());
    }

    /**
     * @param  list<int|string>  $amenityIds
     * @return Collection<int, int>
     */
    private function activeIds(array $amenityIds): Collection
    {
        $normalized = collect($amenityIds)
            ->map(fn (int|string $id): int => (int) $id)
            ->unique()
            ->values();

        if ($normalized->isEmpty()) {
            return collect();
        }

        return Amenity::query()
            ->active()
            ->whereIn('id', $normalized)
            ->pluck('id');
    }

    /**
     * @param  Collection<int, int>  $buildingAmenityIds
     */
    private function pruneUnitDuplicates(Building $building, Collection $buildingAmenityIds): void
    {
        if ($buildingAmenityIds->isEmpty()) {
            return;
        }

        $unitIds = $building->units()->pluck('id');

        if ($unitIds->isEmpty()) {
            return;
        }

        DB::table('unit_amenity')
            ->whereIn('unit_id', $unitIds)
            ->whereIn('amenity_id', $buildingAmenityIds)
            ->delete();
    }
}
