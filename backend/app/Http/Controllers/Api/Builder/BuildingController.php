<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-004
 */
class BuildingController extends Controller
{
    public function index(): JsonResponse
    {
        $buildings = Building::query()
            ->withCount('units')
            ->orderBy('name')
            ->get();

        return response()->json($buildings);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'size:2'],
            'published' => ['sometimes', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
        ]);

        $building = Building::query()->create($data);

        return response()->json($building, 201);
    }

    public function show(Building $building): JsonResponse
    {
        return response()->json($building->load('units'));
    }

    public function update(Request $request, Building $building): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'size:2'],
            'published' => ['sometimes', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
        ]);

        $building->update($data);

        return response()->json($building->fresh());
    }

    public function destroy(Building $building): JsonResponse
    {
        $building->delete();

        return response()->json(null, 204);
    }
}
