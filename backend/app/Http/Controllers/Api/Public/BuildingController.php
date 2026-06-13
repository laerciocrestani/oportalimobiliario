<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Support\BuildingCoverImage;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 * @see REQ-PUB-006
 * @see REQ-PUB-007
 */
class BuildingController extends Controller
{
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
            ->get(['id', 'name', 'description', 'city', 'state', 'seo_title', 'seo_description'])
            ->map(fn (Building $building) => $this->toListArray($building));

        return response()->json($buildings);
    }

    public function show(int $id): JsonResponse
    {
        $building = Building::query()
            ->where('published', true)
            ->with(['units' => fn ($q) => $q->where('status', 'available')])
            ->findOrFail($id);

        return response()->json($building);
    }

    /**
     * @return array<string, mixed>
     */
    protected function toListArray(Building $building): array
    {
        $cheapest = $building->cheapestAvailableUnit;
        $cover = $building->publicCoverMedia;

        return [
            'id' => $building->id,
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
                'area_m2' => $cheapest->area_m2,
                'floor' => $cheapest->floor,
            ] : null,
            'cover_image' => BuildingCoverImage::serialize(
                $cover,
                $building->id,
                "/public/buildings/{$building->id}/media",
            ),
        ];
    }
}
