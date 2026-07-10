<?php

namespace App\Services;

use App\Models\BrokerTenant;
use App\Models\User;
use Illuminate\Support\Collection;

class BrokerAccessService
{
    /**
     * @return Collection<int, int>
     */
    public function activeTenantIdsForBroker(int $brokerId): Collection
    {
        return BrokerTenant::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $brokerId)
            ->whereNotNull('approved_at')
            ->whereNull('revoked_at')
            ->pluck('tenant_id');
    }

    public function hasActiveAccess(User $broker): bool
    {
        return $this->activeTenantIdsForBroker($broker->id)->isNotEmpty();
    }

    /**
     * @return 'active'|'pending_only'|'restricted'
     */
    public function accessStatus(User $broker): string
    {
        $links = BrokerTenant::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $broker->id)
            ->get();

        if ($links->contains(fn (BrokerTenant $link) => $link->isActive())) {
            return 'active';
        }

        if ($links->contains(fn (BrokerTenant $link) => $link->isPendingApproval())) {
            return 'pending_only';
        }

        return 'restricted';
    }

    /**
     * @return array{
     *     role: string,
     *     tenant_context: bool,
     *     access_status: string,
     *     pending_approvals: list<array{tenant_id: int, tenant_name: string, requested_at: string}>,
     *     inactive_tenants: list<array{tenant_id: int, tenant_name: string, revoked_at: string}>,
     *     has_approved_access: bool
     * }
     */
    public function profilePayload(User $broker): array
    {
        $links = BrokerTenant::query()
            ->withoutGlobalScope('tenant')
            ->with('tenant')
            ->where('broker_id', $broker->id)
            ->get();

        $pending = $links
            ->filter(fn (BrokerTenant $link) => $link->isPendingApproval())
            ->map(fn (BrokerTenant $link) => [
                'tenant_id' => $link->tenant_id,
                'tenant_name' => $link->tenant->name,
                'requested_at' => $link->accepted_at->toIso8601String(),
            ])
            ->values()
            ->all();

        $inactive = $links
            ->filter(fn (BrokerTenant $link) => $link->isInactive())
            ->map(fn (BrokerTenant $link) => [
                'tenant_id' => $link->tenant_id,
                'tenant_name' => $link->tenant->name,
                'revoked_at' => $link->revoked_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'role' => 'broker',
            'tenant_context' => false,
            'access_status' => $this->accessStatus($broker),
            'pending_approvals' => $pending,
            'inactive_tenants' => $inactive,
            'has_approved_access' => $links->contains(fn (BrokerTenant $link) => $link->isActive()),
        ];
    }
}
