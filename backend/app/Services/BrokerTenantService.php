<?php

namespace App\Services;

use App\Models\BrokerTenant;
use App\Models\BuildingAccess;
use Illuminate\Validation\ValidationException;

class BrokerTenantService
{
    public function deactivate(BrokerTenant $link, int $tenantId): BrokerTenant
    {
        $this->ensureTenantMatch($link, $tenantId);

        if ($link->isPendingApproval()) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor ainda aguarda aprovação. Recuse a solicitação em Convites.'],
            ]);
        }

        if ($link->isInactive()) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor já está inativo.'],
            ]);
        }

        $link->update(['revoked_at' => now()]);

        return $link->fresh();
    }

    public function reactivate(BrokerTenant $link, int $tenantId): BrokerTenant
    {
        $this->ensureTenantMatch($link, $tenantId);

        if (! $link->isInactive()) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor não está inativo.'],
            ]);
        }

        $link->update(['revoked_at' => null]);

        return $link->fresh();
    }

    public function remove(BrokerTenant $link, int $tenantId): void
    {
        $this->ensureTenantMatch($link, $tenantId);

        BuildingAccess::query()
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $link->broker_id)
            ->delete();

        $link->delete();
    }

    public function findLinkForTenant(int $tenantId, int $brokerId): ?BrokerTenant
    {
        return BrokerTenant::query()
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $brokerId)
            ->first();
    }

    private function ensureTenantMatch(BrokerTenant $link, int $tenantId): void
    {
        if ($link->tenant_id !== $tenantId) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor não pertence a esta construtora.'],
            ]);
        }
    }
}
