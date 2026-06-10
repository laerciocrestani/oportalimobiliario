<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use App\Models\UnitAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-004
 */
class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $unitIds = UnitAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $request->user()->id)
            ->pluck('unit_id');

        $units = Unit::query()
            ->withoutGlobalScope('tenant')
            ->with('building')
            ->whereIn('id', $unitIds)
            ->orderBy('code')
            ->get();

        return response()->json($units);
    }
}
