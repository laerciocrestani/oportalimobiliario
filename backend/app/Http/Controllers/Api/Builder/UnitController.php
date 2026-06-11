<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Tower;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-EMP-002
 * @see REQ-EMP-003
 */
class UnitController extends Controller
{
    public function index(Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        return response()->json(
            $building->units()
                ->with('tower:id,name')
                ->orderByDesc('floor')
                ->orderBy('code')
                ->get()
        );
    }

    public function store(Request $request, Building $building): JsonResponse
    {
        $this->authorize('create', Unit::class);

        $data = $request->validate([
            'tower_id' => ['required', 'integer', Rule::exists('towers', 'id')->where('building_id', $building->id)],
            'code' => [
                'required',
                'string',
                'max:50',
            ],
            'floor' => ['nullable', 'integer', 'min:0'],
            'area_m2' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(UnitStatus::class)],
        ]);

        $tower = Tower::query()->findOrFail($data['tower_id']);

        $this->ensureUniqueCodeInTower($tower, $data['code']);

        $unit = $building->units()->create($data);

        return response()->json($unit->fresh()->load('tower:id,name'), 201);
    }

    public function show(Building $building, Unit $unit): JsonResponse
    {
        $this->ensureUnitBelongsToBuilding($building, $unit);
        $this->authorize('view', $unit);

        return response()->json($unit->load('tower:id,name'));
    }

    public function update(Request $request, Building $building, Unit $unit): JsonResponse
    {
        $this->ensureUnitBelongsToBuilding($building, $unit);

        $data = $request->validate([
            'tower_id' => ['sometimes', 'integer', Rule::exists('towers', 'id')->where('building_id', $building->id)],
            'code' => ['sometimes', 'string', 'max:50'],
            'floor' => ['nullable', 'integer', 'min:0'],
            'area_m2' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(UnitStatus::class)],
        ]);

        $towerId = $data['tower_id'] ?? $unit->tower_id;
        $code = $data['code'] ?? $unit->code;

        if (isset($data['tower_id']) || isset($data['code'])) {
            $tower = Tower::query()->findOrFail($towerId);
            $this->ensureUniqueCodeInTower($tower, $code, $unit->id);
        }

        if (array_key_exists('status', $data)) {
            $this->authorize('updateStatus', $unit);
        }

        $nonStatusFields = collect($data)->except('status');
        if ($nonStatusFields->isNotEmpty()) {
            $this->authorize('update', $unit);
        }

        $unit->update($data);

        return response()->json($unit->fresh()->load('tower:id,name'));
    }

    public function destroy(Building $building, Unit $unit): JsonResponse
    {
        $this->ensureUnitBelongsToBuilding($building, $unit);
        $this->authorize('delete', $unit);

        $unit->delete();

        return response()->json(null, 204);
    }

    private function ensureUnitBelongsToBuilding(Building $building, Unit $unit): void
    {
        if ($unit->building_id !== $building->id) {
            abort(404);
        }
    }

    private function ensureUniqueCodeInTower(Tower $tower, string $code, ?int $ignoreUnitId = null): void
    {
        $exists = $tower->units()
            ->when($ignoreUnitId !== null, fn ($query) => $query->where('id', '!=', $ignoreUnitId))
            ->where('code', $code)
            ->exists();

        if ($exists) {
            abort(422, 'The code has already been taken for this tower.');
        }
    }
}
