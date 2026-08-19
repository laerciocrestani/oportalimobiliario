<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\OpeningType;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Tower;
use App\Models\Unit;
use App\Support\BuildingCoverImage;
use App\Support\BuildingSlug;
use App\Support\UnitsSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-004
 * @see REQ-WIZ-002
 * @see REQ-WIZ-003
 * @see REQ-WIZ-009
 * @see REQ-WIZ-015
 */
class BuildingController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    private function buildingRules(?Building $building = null): array
    {
        $slugUnique = Rule::unique('buildings', 'slug');

        if ($building !== null) {
            $slugUnique = $slugUnique->ignore($building->id);
        }

        return [
            'name' => [$building === null ? 'required' : 'sometimes', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slugUnique],
            'zip' => ['nullable', 'string', 'regex:/^\d{8}$/'],
            'street' => ['nullable', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:30'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'size:2'],
            'ceiling_type' => ['nullable', Rule::enum(CeilingType::class)],
            'opening_type' => ['nullable', Rule::enum(OpeningType::class)],
            'flooring_type' => ['nullable', Rule::enum(FlooringType::class)],
            'solar_position' => ['nullable', Rule::enum(SolarPosition::class)],
            'sun_period' => ['nullable', Rule::enum(SunPeriod::class)],
            'published' => ['sometimes', 'boolean'],
            'wizard_step' => ['sometimes', 'integer', 'min:1', 'max:4'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
        ];
    }

    private function prepareBuildingRequest(Request $request): void
    {
        $merge = [];

        if ($request->exists('zip')) {
            $digits = preg_replace('/\D/', '', (string) $request->input('zip')) ?: null;
            $merge['zip'] = $digits;
        }

        if ($request->exists('state') && is_string($request->input('state'))) {
            $merge['state'] = strtoupper($request->input('state')) ?: null;
        }

        if ($merge !== []) {
            $request->merge($merge);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function blankAddressToNull(array $data): array
    {
        foreach (['zip', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'ceiling_type', 'opening_type', 'flooring_type', 'solar_position', 'sun_period'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        return $data;
    }

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

        $this->prepareBuildingRequest($request);
        $data = $this->blankAddressToNull($request->validate($this->buildingRules()));

        $data['slug'] = $data['slug'] ?? BuildingSlug::generateUnique($data['name']);
        $data['published'] = $data['published'] ?? false;
        $data['wizard_step'] = $data['wizard_step'] ?? 1;

        $building = Building::query()->create($data);
        $building->setAttribute('units_summary', UnitsSummary::empty());

        return response()->json($building, 201);
    }

    public function show(Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        $building->load([
            'towers' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
            'towers.floors' => fn ($query) => $query->orderBy('number'),
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

        $this->prepareBuildingRequest($request);
        $data = $this->blankAddressToNull($request->validate($this->buildingRules($building)));

        if (array_key_exists('published', $data) && filter_var($data['published'], FILTER_VALIDATE_BOOLEAN)) {
            $this->assertCanPublish($building);
            $data['wizard_completed_at'] = now();
            $data['wizard_step'] = $data['wizard_step'] ?? 4;
        }

        $building->update($data);

        return response()->json($building->fresh());
    }

    private function assertCanPublish(Building $building): void
    {
        $availableWithoutPrice = $building->units()
            ->where('status', UnitStatus::Available)
            ->whereNull('price')
            ->exists();

        if ($availableWithoutPrice) {
            throw ValidationException::withMessages([
                'published' => 'Cannot publish while available units have no price.',
            ]);
        }
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
