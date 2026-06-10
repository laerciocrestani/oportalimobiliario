<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use App\Models\UnitAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-CONV-003
 */
class UnitAccessController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'broker_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'broker')],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        $unit = Unit::query()->findOrFail($data['unit_id']);

        $access = UnitAccess::query()->firstOrCreate([
            'broker_id' => $data['broker_id'],
            'unit_id' => $unit->id,
        ], [
            'tenant_id' => $unit->tenant_id,
        ]);

        return response()->json($access->load('unit'), 201);
    }

    public function destroy(UnitAccess $access): JsonResponse
    {
        $access->delete();

        return response()->json(null, 204);
    }
}
