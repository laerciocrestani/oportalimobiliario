<?php

namespace App\Policies;

use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class BuildingAccessPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_ACCESS);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_ACCESS);
    }

    public function delete(User $user, BuildingAccess $buildingAccess): bool
    {
        return $user->can(BuilderPermissions::MANAGE_ACCESS)
            && $this->sameTenant($user, $buildingAccess);
    }

    public function manageBroker(User $user, User $broker): bool
    {
        return $user->can(BuilderPermissions::MANAGE_ACCESS)
            && $broker->role === 'broker';
    }

    public function grantBuilding(User $user, User $broker, Building $building): bool
    {
        return $this->manageBroker($user, $broker)
            && $this->sameTenant($user, $building);
    }
}
