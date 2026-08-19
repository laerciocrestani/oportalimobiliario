<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Tower;
use App\Models\Unit;
use App\Services\UserActivityCatalog;
use App\Support\UnitsSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TowerController extends Controller
{
    public function __construct(
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

    public function index(Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        $towers = $building->towers()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $summaries = $this->summariesForTowers($towers->pluck('id'));

        $towers->each(function (Tower $tower) use ($summaries): void {
            $counts = $summaries->get($tower->id, collect());
            $tower->setAttribute('units_summary', UnitsSummary::fromCounts($counts));
        });

        return response()->json($towers);
    }

    public function store(Request $request, Building $building): JsonResponse
    {
        $this->authorize('create', Tower::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $tower = $building->towers()->create($data);

        $tower->setAttribute('units_summary', UnitsSummary::empty());

        $this->activityCatalog->recordTowerCreated($request->user(), $tower);

        return response()->json($tower, 201);
    }

    public function show(Building $building, Tower $tower): JsonResponse
    {
        $this->ensureTowerBelongsToBuilding($building, $tower);
        $this->authorize('view', $tower);

        $tower->load([
            'units' => fn ($query) => $query->orderByDesc('floor')->orderBy('code'),
        ]);

        $tower->setAttribute('units_summary', $tower->computeUnitsSummary());

        return response()->json($tower);
    }

    public function update(Request $request, Building $building, Tower $tower): JsonResponse
    {
        $this->ensureTowerBelongsToBuilding($building, $tower);
        $this->authorize('update', $tower);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $oldValues = $tower->only(array_keys($data));
        $tower->update($data);

        $this->activityCatalog->recordTowerUpdated($request->user(), $tower, $oldValues, $data);

        return response()->json($tower->fresh());
    }

    public function destroy(Request $request, Building $building, Tower $tower): JsonResponse
    {
        $this->ensureTowerBelongsToBuilding($building, $tower);
        $this->authorize('delete', $tower);

        if ($tower->units()->exists()) {
            abort(422, 'Cannot delete tower with units.');
        }

        $this->activityCatalog->recordTowerDeleted($request->user(), $tower);
        $tower->delete();

        return response()->json(null, 204);
    }

    private function ensureTowerBelongsToBuilding(Building $building, Tower $tower): void
    {
        if ($tower->building_id !== $building->id) {
            abort(404);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>  $towerIds
     * @return \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<string, int>>
     */
    private function summariesForTowers(\Illuminate\Support\Collection $towerIds): \Illuminate\Support\Collection
    {
        if ($towerIds->isEmpty()) {
            return collect();
        }

        return Unit::query()
            ->whereIn('tower_id', $towerIds)
            ->selectRaw('tower_id, status, COUNT(*) as aggregate')
            ->groupBy('tower_id', 'status')
            ->get()
            ->groupBy('tower_id')
            ->map(fn ($rows) => $rows->mapWithKeys(fn ($row) => [
                $row->status instanceof UnitStatus ? $row->status->value : (string) $row->status => (int) $row->aggregate,
            ]));
    }
}
