<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\FloorKind;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BuildingUnitGridService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-WIZ-005
 * @see REQ-WIZ-006
 * @see REQ-WIZ-007
 */
class BuildingUnitGridController extends Controller
{
    public function update(Request $request, Building $building, BuildingUnitGridService $grid): JsonResponse
    {
        $this->authorize('update', $building);

        $data = $request->validate([
            'towers' => ['required', 'array', 'min:1'],
            'towers.*.id' => ['required', 'integer'],
            'towers.*.floors' => ['required', 'array', 'min:1'],
            'towers.*.floors.*.number' => ['required', 'integer', 'min:1'],
            'towers.*.floors.*.kind' => ['required', Rule::enum(FloorKind::class)],
            'towers.*.floors.*.units' => ['required', 'array', 'min:1'],
            'towers.*.floors.*.units.*.code' => ['required', 'string', 'max:50'],
            'towers.*.floors.*.units.*.area_m2' => ['nullable', 'numeric', 'min:0'],
        ]);

        $building = $grid->replace($building, $data['towers']);

        return response()->json($building);
    }
}
