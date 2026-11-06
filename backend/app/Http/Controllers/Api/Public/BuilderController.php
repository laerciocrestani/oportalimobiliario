<?php

namespace App\Http\Controllers\Api\Public;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Support\BuilderAddress;
use App\Support\PublicBuildingList;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-PUB-011
 */
class BuilderController extends Controller
{
    public function __construct(private PublicBuildingList $buildings) {}

    public function index(): JsonResponse
    {
        $builders = $this->catalog()
            ->orderBy('name')
            ->get()
            ->map(fn (Tenant $tenant) => $this->summary($tenant))
            ->values();

        return response()->json($builders);
    }

    public function show(string $slug): JsonResponse
    {
        $tenant = $this->catalog()->where('slug', $slug)->first();

        if ($tenant === null) {
            abort(404);
        }

        return response()->json([
            ...$this->summary($tenant),
            'buildings' => $this->buildings->published($tenant->id),
        ]);
    }

    /**
     * @return Builder<Tenant>
     */
    private function catalog(): Builder
    {
        return Tenant::query()
            ->where('active', true)
            ->whereHas('buildings', fn (Builder $query) => $query->where('published', true))
            ->withCount([
                'buildings as buildings_count' => fn (Builder $query) => $query->where('published', true),
                'units as available_units_count' => fn (Builder $query) => $query
                    ->where('status', UnitStatus::Available)
                    ->whereHas('building', fn (Builder $building) => $building->where('published', true)),
            ])
            ->with([
                'buildings' => fn ($query) => $query
                    ->where('published', true)
                    ->select(['id', 'tenant_id', 'street', 'number', 'neighborhood', 'city', 'state']),
            ]);
    }

    /**
     * @return array{slug: string, name: string, logo_url: null, address: string|null, buildings_count: int, available_units_count: int}
     */
    private function summary(Tenant $tenant): array
    {
        return [
            'slug' => $tenant->slug,
            'name' => $tenant->name,
            'logo_url' => null,
            'address' => BuilderAddress::fromBuildings($tenant->buildings),
            'buildings_count' => (int) $tenant->buildings_count,
            'available_units_count' => (int) $tenant->available_units_count,
        ];
    }
}
