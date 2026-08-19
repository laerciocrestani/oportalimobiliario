<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BuildingStructureService;
use App\Services\UserActivityCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-WIZ-004
 */
class BuildingStructureController extends Controller
{
    public function __construct(
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

    public function update(Request $request, Building $building, BuildingStructureService $structure): JsonResponse
    {
        $this->authorize('update', $building);

        $data = $request->validate([
            'towers' => ['required', 'array', 'min:1', 'max:20'],
            'towers.*.name' => ['required', 'string', 'max:255'],
            'towers.*.floors_count' => ['required', 'integer', 'min:1', 'max:80'],
        ]);

        $building = $structure->replace($building, $data['towers']);
        $this->activityCatalog->recordBuildingStructureReplaced(
            $request->user(),
            $building,
            count($data['towers']),
        );

        return response()->json($building);
    }
}
