<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 */
class BuildingController extends Controller
{
    public function index(): JsonResponse
    {
        $buildings = Building::query()
            ->where('published', true)
            ->withCount('units')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'city', 'state', 'seo_title', 'seo_description']);

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
}
