<?php

namespace App\Services;

use App\Models\BuildingAccess;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;

/**
 * Resolves broker access to a unit via BuildingAccess or legacy UnitAccess.
 */
class BrokerUnitAccessService
{
    /**
     * @return array{tenant_id: int}|null
     */
    public function resolveAccess(User $broker, Unit $unit): ?array
    {
        $unitAccess = UnitAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $broker->id)
            ->where('unit_id', $unit->id)
            ->first();

        if ($unitAccess !== null) {
            return ['tenant_id' => $unitAccess->tenant_id];
        }

        $buildingAccess = BuildingAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $broker->id)
            ->where('building_id', $unit->building_id)
            ->first();

        if ($buildingAccess !== null) {
            return ['tenant_id' => $buildingAccess->tenant_id];
        }

        return null;
    }
}
