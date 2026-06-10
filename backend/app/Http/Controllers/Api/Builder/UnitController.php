<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Building;
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
        return response()->json(
            $building->units()->orderBy('code')->get()
        );
    }

    public function store(Request $request, Building $building): JsonResponse
    {
        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('units', 'code')->where('building_id', $building->id),
            ],
            'floor' => ['nullable', 'integer', 'min:0'],
            'area_m2' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(UnitStatus::class)],
        ]);

        $unit = $building->units()->create($data);

        return response()->json($unit->fresh(), 201);
    }

    public function show(Building $building, Unit $unit): JsonResponse
    {
        $this->ensureUnitBelongsToBuilding($building, $unit);

        return response()->json($unit);
    }

    public function update(Request $request, Building $building, Unit $unit): JsonResponse
    {
        $this->ensureUnitBelongsToBuilding($building, $unit);

        $data = $request->validate([
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('units', 'code')
                    ->where('building_id', $building->id)
                    ->ignore($unit->id),
            ],
            'floor' => ['nullable', 'integer', 'min:0'],
            'area_m2' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(UnitStatus::class)],
        ]);

        $unit->update($data);

        return response()->json($unit->fresh());
    }

    public function destroy(Building $building, Unit $unit): JsonResponse
    {
        $this->ensureUnitBelongsToBuilding($building, $unit);

        $unit->delete();

        return response()->json(null, 204);
    }

    private function ensureUnitBelongsToBuilding(Building $building, Unit $unit): void
    {
        if ($unit->building_id !== $building->id) {
            abort(404);
        }
    }
}
