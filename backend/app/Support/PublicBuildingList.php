<?php

namespace App\Support;

use App\Models\Building;
use App\Services\UnitPriceCalculator;

class PublicBuildingList
{
    public function __construct(private UnitPriceCalculator $prices) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function published(?int $tenantId = null): array
    {
        return Building::query()
            ->where('published', true)
            ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
            ->withCount('units')
            ->with([
                'cheapestAvailableUnit',
                'publicCoverMedia',
                'tenant.builderUsers',
            ])
            ->orderBy('name')
            ->get(['id', 'tenant_id', 'slug', 'name', 'description', 'city', 'state', 'seo_title', 'seo_description'])
            ->map(fn (Building $building) => $this->toListArray($building))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function toListArray(Building $building): array
    {
        $cheapest = $building->cheapestAvailableUnit;
        $cover = $building->publicCoverMedia;
        $mediaPrefix = "/public/buildings/{$building->slug}/media";

        if ($cheapest !== null) {
            $this->prices->decorate($cheapest);
        }

        return [
            'id' => $building->id,
            'slug' => $building->slug,
            'name' => $building->name,
            'description' => $building->description,
            'city' => $building->city,
            'state' => $building->state,
            'seo_title' => $building->seo_title,
            'seo_description' => $building->seo_description,
            'units_count' => $building->units_count,
            'cheapest_unit' => $cheapest ? [
                'code' => $cheapest->code,
                'price' => $cheapest->price,
                'price_base' => $cheapest->price_base,
                'price_competence' => $cheapest->price_competence?->toDateString(),
                'price_incc_current' => $cheapest->price_incc_current,
                'area_m2' => $cheapest->area_m2,
                'floor' => $cheapest->floor,
            ] : null,
            'cover_image' => BuildingCoverImage::serialize(
                $cover,
                $building->id,
                $mediaPrefix,
            ),
            'builder' => BuilderContact::for($building),
        ];
    }
}
