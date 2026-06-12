<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-CONV-007
 */
class BuildingAccessController extends Controller
{
    public function store(Request $request, User $broker): JsonResponse
    {
        $this->authorize('create', BuildingAccess::class);

        if ($broker->role !== 'broker') {
            return response()->json(['message' => 'Usuário não é corretor.'], 422);
        }

        $data = $request->validate([
            'building_id' => [
                'required',
                'integer',
                Rule::exists('buildings', 'id')->where('tenant_id', $request->user()->tenant_id),
            ],
        ]);

        $tenantId = $request->user()->tenant_id;

        if (! $this->brokerLinkedToTenant($tenantId, $broker->id)) {
            return response()->json(['message' => 'Corretor não vinculado a esta construtora.'], 404);
        }

        $building = Building::query()->findOrFail($data['building_id']);

        $access = BuildingAccess::query()->firstOrCreate([
            'broker_id' => $broker->id,
            'building_id' => $building->id,
        ], [
            'tenant_id' => $tenantId,
        ]);

        return response()->json($access->load('building'), 201);
    }

    public function destroy(Request $request, User $broker, Building $building): JsonResponse
    {
        $access = BuildingAccess::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->where('broker_id', $broker->id)
            ->where('building_id', $building->id)
            ->firstOrFail();

        $this->authorize('delete', $access);

        $access->delete();

        return response()->json(null, 204);
    }

    private function brokerLinkedToTenant(int $tenantId, int $brokerId): bool
    {
        return BrokerTenant::query()
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $brokerId)
            ->exists();
    }
}
