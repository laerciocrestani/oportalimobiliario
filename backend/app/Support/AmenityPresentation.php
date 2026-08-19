<?php

namespace App\Support;

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Unit;
use BackedEnum;
use Illuminate\Support\Collection;

/**
 * Serializes building amenities and the unit union DTO (building ∪ extras).
 *
 * @see REQ-WIZ-009
 */
class AmenityPresentation
{
    /**
     * @return array<string, callable>
     */
    public static function buildingEagerLoad(): array
    {
        $orderByName = fn ($query) => $query->orderBy('name');

        return [
            'amenities' => $orderByName,
            'units.amenities' => $orderByName,
            'towers.units.amenities' => $orderByName,
        ];
    }

    public static function decorateBuilding(Building $building): Building
    {
        if (! $building->relationLoaded('amenities')) {
            $building->load(self::amenitiesRelation());
        }

        $building->setRelation(
            'amenities',
            $building->amenities
                ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                ->values(),
        );

        if ($building->relationLoaded('units')) {
            $building->units->each(fn (Unit $unit) => self::decorateUnit($unit, $building));
        }

        if ($building->relationLoaded('towers')) {
            foreach ($building->towers as $tower) {
                if ($tower->relationLoaded('units')) {
                    $tower->units->each(fn (Unit $unit) => self::decorateUnit($unit, $building));
                }
            }
        }

        return $building;
    }

    public static function decorateUnit(Unit $unit, ?Building $building = null): Unit
    {
        if (array_key_exists('resolved_defaults', $unit->getAttributes())) {
            return $unit;
        }

        $building ??= $unit->relationLoaded('building')
            ? $unit->building
            : $unit->loadMissing(['building.amenities' => fn ($query) => $query->orderBy('name')])->building;

        if ($building !== null && ! $building->relationLoaded('amenities')) {
            $building->load(self::amenitiesRelation());
        }

        if (! $unit->relationLoaded('amenities')) {
            $unit->load(self::amenitiesRelation());
        }

        $inherited = $building?->amenities ?? collect();
        $extra = $unit->amenities;

        $union = $inherited
            ->concat($extra)
            ->unique('id')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $unit->unsetRelation('amenities');
        $unit->setAttribute('amenities', self::serializeCollection($union));
        $unit->setAttribute(
            'inherited_amenities',
            self::serializeCollection($inherited->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values()),
        );
        $unit->setAttribute(
            'extra_amenities',
            self::serializeCollection($extra->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values()),
        );
        $unit->setAttribute('resolved_defaults', self::resolvedDefaults($unit, $building));

        return $unit;
    }

    /**
     * @return array{ceiling_type: ?string, opening_type: ?string, flooring_type: ?string, solar_position: ?string, sun_period: ?string}
     */
    public static function resolvedDefaults(Unit $unit, ?Building $building): array
    {
        return [
            'ceiling_type' => self::enumValue($unit->ceiling_type ?? $building?->ceiling_type),
            'opening_type' => self::enumValue($unit->opening_type ?? $building?->opening_type),
            'flooring_type' => self::enumValue($unit->flooring_type ?? $building?->flooring_type),
            'solar_position' => self::enumValue($unit->solar_position ?? $building?->solar_position),
            'sun_period' => self::enumValue($unit->sun_period ?? $building?->sun_period),
        ];
    }

    /**
     * @return array<string, callable>
     */
    private static function amenitiesRelation(): array
    {
        return ['amenities' => fn ($query) => $query->orderBy('name')];
    }

    /**
     * @param  Collection<int, Amenity>  $amenities
     * @return list<array{id: int, slug: string, name: string, active: bool}>
     */
    private static function serializeCollection(Collection $amenities): array
    {
        return $amenities
            ->map(fn (Amenity $amenity) => [
                'id' => $amenity->id,
                'slug' => $amenity->slug,
                'name' => $amenity->name,
                'active' => $amenity->active,
            ])
            ->values()
            ->all();
    }

    private static function enumValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return $value instanceof BackedEnum ? $value->value : (string) $value;
    }
}
