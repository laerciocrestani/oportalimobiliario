<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerTenant;
use App\Models\BuildingAccess;
use App\Models\User;
use App\Services\BrokerTenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * @see REQ-CONV-007
 */
class BrokerController extends Controller
{
    public function __construct(private BrokerTenantService $brokerTenantService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', BuildingAccess::class);

        $tenantId = $request->user()->tenant_id;

        /** @var Collection<int, Collection<int, BuildingAccess>> $accessByBroker */
        $accessByBroker = BuildingAccess::query()
            ->with('building')
            ->where('tenant_id', $tenantId)
            ->get()
            ->groupBy('broker_id');

        $brokers = BrokerTenant::query()
            ->with('broker')
            ->where('tenant_id', $tenantId)
            ->approved()
            ->orderBy('accepted_at', 'desc')
            ->get()
            ->map(function (BrokerTenant $link) use ($accessByBroker): array {
                $accesses = $accessByBroker->get($link->broker_id, collect());
                $broker = $link->broker;

                return [
                    'id' => $broker->id,
                    'name' => $broker->name,
                    'email' => $broker->usesSyntheticEmail() ? null : $broker->email,
                    'phone' => $broker->phone,
                    'status' => $link->isActive() ? 'active' : 'inactive',
                    'accepted_at' => $link->accepted_at->toIso8601String(),
                    'revoked_at' => $link->revoked_at?->toIso8601String(),
                    'buildings_count' => $accesses->count(),
                    'buildings' => $accesses
                        ->map(fn (BuildingAccess $access) => [
                            'id' => $access->building->id,
                            'name' => $access->building->name,
                        ])
                        ->values()
                        ->all(),
                ];
            });

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

    public function deactivate(Request $request, User $broker): JsonResponse
    {
        $this->authorize('viewAny', BuildingAccess::class);

        $link = $this->brokerTenantService->findLinkForTenant($request->user()->tenant_id, $broker->id);

        if ($link === null) {
            return response()->json(['message' => 'Corretor não vinculado a esta construtora.'], 404);
        }

        $link = $this->brokerTenantService->deactivate($link, $request->user()->tenant_id);

        return response()->json([
            'id' => $broker->id,
            'status' => 'inactive',
            'revoked_at' => $link->revoked_at?->toIso8601String(),
        ]);
    }

    public function reactivate(Request $request, User $broker): JsonResponse
    {
        $this->authorize('viewAny', BuildingAccess::class);

        $link = $this->brokerTenantService->findLinkForTenant($request->user()->tenant_id, $broker->id);

        if ($link === null) {
            return response()->json(['message' => 'Corretor não vinculado a esta construtora.'], 404);
        }

        $link = $this->brokerTenantService->reactivate($link, $request->user()->tenant_id);

        return response()->json([
            'id' => $broker->id,
            'status' => 'active',
            'revoked_at' => null,
        ]);
    }

    public function destroy(Request $request, User $broker): JsonResponse
    {
        $this->authorize('viewAny', BuildingAccess::class);

        $link = $this->brokerTenantService->findLinkForTenant($request->user()->tenant_id, $broker->id);

        if ($link === null) {
            return response()->json(['message' => 'Corretor não vinculado a esta construtora.'], 404);
        }

        $this->brokerTenantService->remove($link, $request->user()->tenant_id);

        return response()->json(null, 204);
    }

    private function brokerLinkedToTenant(int $tenantId, int $brokerId): bool
    {
        return BrokerTenant::query()
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $brokerId)
            ->approved()
            ->exists();
    }
}
