<?php

namespace App\Policies;

use App\Models\Building;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class BuildingPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::VIEW_BUILDINGS);
    }

    public function view(User $user, Building $building): bool
    {
        return $user->can(BuilderPermissions::VIEW_BUILDINGS)
            && $this->sameTenant($user, $building);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS);
    }

    public function update(User $user, Building $building): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $building);
    }

    public function delete(User $user, Building $building): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $building);
    }
}
