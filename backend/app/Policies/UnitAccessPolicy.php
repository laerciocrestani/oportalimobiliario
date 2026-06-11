<?php

namespace App\Policies;

use App\Models\UnitAccess;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class UnitAccessPolicy
{
    use AuthorizesBuilderTenant;

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_ACCESS);
    }

    public function delete(User $user, UnitAccess $unitAccess): bool
    {
        return $user->can(BuilderPermissions::MANAGE_ACCESS)
            && $this->sameTenant($user, $unitAccess);
    }
}
