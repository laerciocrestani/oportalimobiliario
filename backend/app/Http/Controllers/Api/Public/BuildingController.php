<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Support\AmenityPresentation;
use App\Support\BuilderContact;
use App\Support\PublicBuildingList;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 * @see REQ-PUB-006
 * @see REQ-PUB-007
 * @see REQ-PUB-009
 * @see REQ-WIZ-009
 * @see REQ-WIZ-011
 * @see REQ-WIZ-016
 */
class BuildingController extends Controller
{
    public function __construct(private PublicBuildingList $buildings) {}

    public function index(): JsonResponse
    {
        return response()->json($this->buildings->published());
    }

    public function show(Building $building): JsonResponse
    {
        if (! $building->published) {
            abort(404);
        }

        $building->load([
            'amenities' => fn ($query) => $query->orderBy('name'),
            'tenant.builderUsers',
            'units' => fn ($query) => $query
                ->where('status', 'available')
                ->with(['amenities' => fn ($amenities) => $amenities->orderBy('name')]),
        ]);
        AmenityPresentation::decorateBuilding($building);
        $builder = BuilderContact::for($building);
        $building->unsetRelation('tenant');

        return response()->json([
            ...$building->toArray(),
            'builder' => $builder,
        ]);
    }
}
