<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\BuildingAccess;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Services\BrokerAccessService;
use App\Support\BrokerUnitSerializer;
use App\Support\BuildingCoverImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-004
 * @see REQ-CONV-007
 */
class UnitController extends Controller
{
    public function __construct(private BrokerAccessService $brokerAccessService) {}

    public function index(Request $request): JsonResponse
    {
        $brokerId = $request->user()->id;
        $activeTenantIds = $this->brokerAccessService->activeTenantIdsForBroker($brokerId);

        $buildingIds = BuildingAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $brokerId)
            ->whereIn('tenant_id', $activeTenantIds)
            ->pluck('building_id');

        $legacyUnitIds = UnitAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $brokerId)
            ->whereIn('tenant_id', $activeTenantIds)
            ->pluck('unit_id');

        $units = Unit::query()
            ->withoutGlobalScope('tenant')
            ->with([
                'building.tenant',
                'building.publicCoverMedia',
                'reservation.client',
            ])
            ->where(function ($query) use ($buildingIds, $legacyUnitIds): void {
                if ($buildingIds->isNotEmpty()) {
                    $query->whereIn('building_id', $buildingIds);
                }

                if ($legacyUnitIds->isNotEmpty()) {
                    $method = $buildingIds->isNotEmpty() ? 'orWhereIn' : 'whereIn';
                    $query->{$method}('id', $legacyUnitIds);
                }

                if ($buildingIds->isEmpty() && $legacyUnitIds->isEmpty()) {
                    $query->whereRaw('0 = 1');
                }
            })
            ->orderBy('code')
            ->get();

        $coverByBuilding = [];

        $units->each(function (Unit $unit) use (&$coverByBuilding): void {
            $building = $unit->building;

            if ($building === null) {
                return;
            }

            if (! array_key_exists($building->id, $coverByBuilding)) {
                $coverByBuilding[$building->id] = BuildingCoverImage::serialize(
                    $building->publicCoverMedia,
                    $building->id,
                    "/broker/buildings/{$building->id}/media",
                );
            }

            $building->setAttribute('cover_image', $coverByBuilding[$building->id]);
        });

        return response()->json(
            $units->map(fn (Unit $unit) => BrokerUnitSerializer::serialize($unit, $brokerId))->values(),
        );
    }
}
