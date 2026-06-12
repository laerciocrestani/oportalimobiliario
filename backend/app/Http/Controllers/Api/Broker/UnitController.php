<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\BuildingAccess;
use App\Models\Unit;
use App\Models\UnitAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-004
 * @see REQ-CONV-007
 */
class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $brokerId = $request->user()->id;

        $buildingIds = BuildingAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $brokerId)
            ->pluck('building_id');

        $legacyUnitIds = UnitAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $brokerId)
            ->pluck('unit_id');

        $units = Unit::query()
            ->withoutGlobalScope('tenant')
            ->with('building')
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

        return response()->json($units);
    }
}
