<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerTenant;
use App\Models\BuildingAccess;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-007
 */
class BrokerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', BuildingAccess::class);

        $tenantId = $request->user()->tenant_id;

        $brokers = BrokerTenant::query()
            ->with('broker')
            ->where('tenant_id', $tenantId)
            ->orderBy('accepted_at', 'desc')
            ->get()
            ->map(fn (BrokerTenant $link) => [
                'id' => $link->broker->id,
                'name' => $link->broker->name,
                'email' => $link->broker->email,
                'accepted_at' => $link->accepted_at->toIso8601String(),
            ]);

        return response()->json($brokers);
    }

    public function buildings(Request $request, User $broker): JsonResponse
    {
        $this->authorize('viewAny', BuildingAccess::class);

        if ($broker->role !== 'broker') {
            return response()->json(['message' => 'Usuário não é corretor.'], 422);
        }

        $tenantId = $request->user()->tenant_id;

        if (! $this->brokerLinkedToTenant($tenantId, $broker->id)) {
            return response()->json(['message' => 'Corretor não vinculado a esta construtora.'], 404);
        }

        $buildings = BuildingAccess::query()
            ->with('building')
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $broker->id)
            ->get()
            ->map(fn (BuildingAccess $access) => [
                'id' => $access->building->id,
                'name' => $access->building->name,
                'granted_at' => $access->created_at?->toIso8601String(),
            ]);

        return response()->json($buildings);
    }

    private function brokerLinkedToTenant(int $tenantId, int $brokerId): bool
    {
        return BrokerTenant::query()
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $brokerId)
            ->exists();
    }
}
