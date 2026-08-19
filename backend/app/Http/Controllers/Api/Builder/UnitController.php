<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\OpeningType;
use App\Enums\PropertyPosition;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Tower;
use App\Models\Unit;
use App\Services\UnitFloorBackfill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-EMP-002
 * @see REQ-EMP-003
 * @see REQ-WIZ-008
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
            ...$this->specRules(),
        ]);

        $tower = Tower::query()->findOrFail($data['tower_id']);

        $this->ensureUniqueCodeInTower($tower, $data['code']);

        $unit = $building->units()->create($this->syncLegacyPriceAndArea($data));
        app(UnitFloorBackfill::class)->attachFloor($unit);

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
            ...$this->specRules(),
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

        $unit->update($this->syncLegacyPriceAndArea($data));
        app(UnitFloorBackfill::class)->attachFloor($unit->fresh());

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

    /**
     * @return array<string, list<mixed>>
     */
    private function specRules(): array
    {
        return [
            'private_area_m2' => ['nullable', 'numeric', 'min:0'],
            'total_area_m2' => ['nullable', 'numeric', 'min:0'],
            'bedrooms' => ['nullable', 'integer', 'min:0'],
            'bathrooms' => ['nullable', 'integer', 'min:0'],
            'suites' => ['nullable', 'integer', 'min:0'],
            'powder_rooms' => ['nullable', 'integer', 'min:0'],
            'balconies' => ['nullable', 'integer', 'min:0'],
            'solar_position' => ['nullable', Rule::enum(SolarPosition::class)],
            'sun_period' => ['nullable', Rule::enum(SunPeriod::class)],
            'property_position' => ['nullable', Rule::enum(PropertyPosition::class)],
            'ceiling_type' => ['nullable', Rule::enum(CeilingType::class)],
            'opening_type' => ['nullable', Rule::enum(OpeningType::class)],
            'flooring_type' => ['nullable', Rule::enum(FlooringType::class)],
            'price_base' => ['nullable', 'numeric', 'min:0'],
            'price_competence' => ['nullable', 'date'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function syncLegacyPriceAndArea(array $data): array
    {
        if (array_key_exists('price', $data) && ! array_key_exists('price_base', $data)) {
            $data['price_base'] = $data['price'];
        }

        if (array_key_exists('price_base', $data) && ! array_key_exists('price', $data)) {
            $data['price'] = $data['price_base'];
        }

        if (array_key_exists('area_m2', $data) && ! array_key_exists('private_area_m2', $data)) {
            $data['private_area_m2'] = $data['area_m2'];
        }

        if (array_key_exists('private_area_m2', $data) && ! array_key_exists('area_m2', $data)) {
            $data['area_m2'] = $data['private_area_m2'];
        }

        return $data;
    }
}
