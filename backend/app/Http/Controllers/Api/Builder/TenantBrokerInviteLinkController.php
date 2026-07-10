<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerTenant;
use App\Models\TenantBrokerInviteLink;
use App\Services\TenantBrokerInviteLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantBrokerInviteLinkController extends Controller
{
    public function __construct(private TenantBrokerInviteLinkService $inviteLinkService) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorize('viewAny', TenantBrokerInviteLink::class);

        $link = $this->inviteLinkService->getOrCreateForTenant(
            $request->user()->tenant_id,
            $request->user()->id,
        );

        return response()->json($this->formatLink($link));
    }

    public function regenerate(Request $request): JsonResponse
    {
        $this->authorize('regenerate', TenantBrokerInviteLink::class);

        $link = $this->inviteLinkService->getOrCreateForTenant(
            $request->user()->tenant_id,
            $request->user()->id,
        );

        $link = $this->inviteLinkService->regenerate($link, $request->user()->id);

        return response()->json($this->formatLink($link));
    }

    public function pendingBrokers(Request $request): JsonResponse
    {
        $this->authorize('viewAny', TenantBrokerInviteLink::class);

        $pending = BrokerTenant::query()
            ->with('broker')
            ->where('tenant_id', $request->user()->tenant_id)
            ->pendingApproval()
            ->orderByDesc('accepted_at')
            ->get()
            ->map(fn (BrokerTenant $link): array => [
                'id' => $link->id,
                'broker_id' => $link->broker_id,
                'name' => $link->broker->name,
                'email' => $link->broker->usesSyntheticEmail() ? null : $link->broker->email,
                'phone' => $link->broker->phone,
                'requested_at' => $link->accepted_at->toIso8601String(),
            ]);

        return response()->json($pending);
    }

    public function approve(Request $request, BrokerTenant $brokerTenant): JsonResponse
    {
        $this->authorize('approvePending', TenantBrokerInviteLink::class);

        $link = $this->inviteLinkService->approve($brokerTenant, $request->user()->tenant_id);

        return response()->json([
            'id' => $link->broker_id,
            'approved_at' => $link->approved_at?->toIso8601String(),
        ]);
    }

    public function reject(Request $request, BrokerTenant $brokerTenant): JsonResponse
    {
        $this->authorize('approvePending', TenantBrokerInviteLink::class);

        $this->inviteLinkService->reject($brokerTenant, $request->user()->tenant_id);

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatLink(TenantBrokerInviteLink $link): array
    {
        return [
            'token' => $link->token,
            'invite_url' => $this->inviteLinkService->inviteUrl($link),
            'regenerated_at' => $link->regenerated_at?->toIso8601String(),
            'created_at' => $link->created_at?->toIso8601String(),
        ];
    }
}
