<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\FloorKind;
use App\Enums\OpeningType;
use App\Enums\PropertyPosition;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BuildingUnitGridService;
use App\Services\UserActivityCatalog;
use App\Support\AmenityPresentation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-WIZ-005
 * @see REQ-WIZ-006
 * @see REQ-WIZ-007
 * @see REQ-WIZ-008
 * @see REQ-WIZ-009
 */
class BuildingUnitGridController extends Controller
{
    public function __construct(
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

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
            'towers.*.floors.*.units.*.private_area_m2' => ['nullable', 'numeric', 'min:0'],
            'towers.*.floors.*.units.*.total_area_m2' => ['nullable', 'numeric', 'min:0'],
            'towers.*.floors.*.units.*.bedrooms' => ['nullable', 'integer', 'min:0'],
            'towers.*.floors.*.units.*.bathrooms' => ['nullable', 'integer', 'min:0'],
            'towers.*.floors.*.units.*.suites' => ['nullable', 'integer', 'min:0'],
            'towers.*.floors.*.units.*.powder_rooms' => ['nullable', 'integer', 'min:0'],
            'towers.*.floors.*.units.*.balconies' => ['nullable', 'integer', 'min:0'],
            'towers.*.floors.*.units.*.price' => ['nullable', 'numeric', 'min:0'],
            'towers.*.floors.*.units.*.price_base' => ['nullable', 'numeric', 'min:0'],
            'towers.*.floors.*.units.*.price_competence' => ['nullable', 'date'],
            'towers.*.floors.*.units.*.property_position' => ['nullable', Rule::enum(PropertyPosition::class)],
            'towers.*.floors.*.units.*.solar_position' => ['nullable', Rule::enum(SolarPosition::class)],
            'towers.*.floors.*.units.*.sun_period' => ['nullable', Rule::enum(SunPeriod::class)],
            'towers.*.floors.*.units.*.ceiling_type' => ['nullable', Rule::enum(CeilingType::class)],
            'towers.*.floors.*.units.*.opening_type' => ['nullable', Rule::enum(OpeningType::class)],
            'towers.*.floors.*.units.*.flooring_type' => ['nullable', Rule::enum(FlooringType::class)],
            'towers.*.floors.*.units.*.amenity_ids' => ['sometimes', 'array'],
            'towers.*.floors.*.units.*.amenity_ids.*' => ['integer', Rule::exists('amenities', 'id')->where('active', true)],
        ]);

        $building = $grid->replace($building, $data['towers']);
        $this->activityCatalog->recordBuildingUnitGridReplaced(
            $request->user(),
            $building,
            $building->units()->count(),
        );

        return response()->json(AmenityPresentation::decorateBuilding($building));
    }
}
