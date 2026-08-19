<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BuildingStructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-WIZ-004
 */
class BuildingStructureController extends Controller
{
    public function update(Request $request, Building $building, BuildingStructureService $structure): JsonResponse
    {
        $this->authorize('update', $building);

        $data = $request->validate([
            'towers' => ['required', 'array', 'min:1', 'max:20'],
            'towers.*.name' => ['required', 'string', 'max:255'],
            'towers.*.floors_count' => ['required', 'integer', 'min:1', 'max:80'],
        ]);

        $building = $structure->replace($building, $data['towers']);

        return response()->json($building);
    }
}
