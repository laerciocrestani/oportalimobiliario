<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\FloorKind;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BuildingStructureService;
use App\Services\UserActivityCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-WIZ-004
 * @see REQ-WZR-002
 * @see REQ-WZR-003
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
            'towers.*.reference_floor' => ['nullable', 'integer', 'min:-20', 'max:80'],
            'towers.*.floors_count' => ['required_without:towers.*.floors', 'integer', 'min:1', 'max:80'],
            'towers.*.floors' => ['required_without:towers.*.floors_count', 'array', 'min:1', 'max:101'],
            'towers.*.floors.*.number' => ['required', 'integer', 'min:-20', 'max:80'],
            'towers.*.floors.*.kind' => ['required', Rule::enum(FloorKind::class)],
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
