<?php

namespace App\Policies;

use App\Models\Unit;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class UnitPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::VIEW_BUILDINGS);
    }

    public function view(User $user, Unit $unit): bool
    {
        return $user->can(BuilderPermissions::VIEW_BUILDINGS)
            && $this->sameTenant($user, $unit);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_UNITS);
    }

    public function update(User $user, Unit $unit): bool
    {
        return $user->can(BuilderPermissions::MANAGE_UNITS)
            && $this->sameTenant($user, $unit);
    }

    public function updateStatus(User $user, Unit $unit): bool
    {
        return $user->can(BuilderPermissions::UPDATE_UNIT_STATUS)
            && $this->sameTenant($user, $unit);
    }

    public function delete(User $user, Unit $unit): bool
    {
        return $user->can(BuilderPermissions::MANAGE_UNITS)
            && $this->sameTenant($user, $unit);
    }
}
