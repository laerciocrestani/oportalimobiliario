<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Tower;
use App\Models\Unit;
use App\Support\BuildingCoverImage;
use App\Support\UnitsSummary;
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
        $this->authorize('viewAny', Building::class);

        $buildings = Building::query()
            ->with('coverMedia')
            ->orderBy('name')
            ->get();

        $summaries = $this->summariesForBuildings($buildings->pluck('id'));

        $buildings->each(function (Building $building) use ($summaries): void {
            $counts = $summaries->get($building->id, collect());
            $building->setAttribute('units_summary', UnitsSummary::fromCounts($counts));
            $building->setAttribute(
                'cover_image',
                BuildingCoverImage::serialize(
                    $building->coverMedia,
                    $building->id,
                    "/builder/buildings/{$building->id}/media",
                ),
            );
        });

        return response()->json($buildings);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Building::class);

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
        $building->setAttribute('units_summary', UnitsSummary::empty());

        return response()->json($building, 201);
    }

    public function show(Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        $building->load([
            'towers' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
            'towers.units' => fn ($query) => $query->orderByDesc('floor')->orderBy('code'),
            'units.tower:id,name,building_id',
            'units' => fn ($query) => $query->orderByDesc('floor')->orderBy('code'),
        ]);

        $building->setAttribute('units_summary', $building->computeUnitsSummary());

        $building->towers->each(function (Tower $tower): void {
            $tower->setAttribute('units_summary', $tower->computeUnitsSummary());
        });

        return response()->json($building);
    }

    public function update(Request $request, Building $building): JsonResponse
    {
        $this->authorize('update', $building);

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
        $this->authorize('delete', $building);

        $building->delete();

        return response()->json(null, 204);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>  $buildingIds
     * @return \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<string, int>>
     */
    private function summariesForBuildings(\Illuminate\Support\Collection $buildingIds): \Illuminate\Support\Collection
    {
        if ($buildingIds->isEmpty()) {
            return collect();
        }

        return Unit::query()
            ->whereIn('building_id', $buildingIds)
            ->selectRaw('building_id, status, COUNT(*) as aggregate')
            ->groupBy('building_id', 'status')
            ->get()
            ->groupBy('building_id')
            ->map(fn ($rows) => $rows->mapWithKeys(fn ($row) => [
                $row->status instanceof UnitStatus ? $row->status->value : (string) $row->status => (int) $row->aggregate,
            ]));
    }
}
