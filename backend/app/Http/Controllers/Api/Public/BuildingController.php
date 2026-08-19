<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\UnitPriceCalculator;
use App\Support\BuildingCoverImage;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 * @see REQ-PUB-006
 * @see REQ-PUB-007
 * @see REQ-PUB-009
 * @see REQ-WIZ-011
 * @see REQ-WIZ-016
 */
class BuildingController extends Controller
{
    public function __construct(private UnitPriceCalculator $prices) {}

    public function index(): JsonResponse
    {
        $buildings = Building::query()
            ->where('published', true)
            ->withCount('units')
            ->with([
                'cheapestAvailableUnit',
                'publicCoverMedia',
            ])
            ->orderBy('name')
            ->get(['id', 'slug', 'name', 'description', 'city', 'state', 'seo_title', 'seo_description'])
            ->map(fn (Building $building) => $this->toListArray($building));

        return response()->json($buildings);
    }

    public function show(Building $building): JsonResponse
    {
        if (! $building->published) {
            abort(404);
        }

        $building->load(['units' => fn ($q) => $q->where('status', 'available')]);
        $this->prices->decorateMany($building->units);

        return response()->json($building);
    }

    /**
     * @return array<string, mixed>
     */
    protected function toListArray(Building $building): array
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
        ];
    }
}
