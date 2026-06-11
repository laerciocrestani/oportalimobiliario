<?php

namespace App\Policies;

use App\Models\Tower;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class TowerPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::VIEW_BUILDINGS);
    }

    public function view(User $user, Tower $tower): bool
    {
        return $user->can(BuilderPermissions::VIEW_BUILDINGS)
            && $this->sameTenant($user, $tower);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS);
    }

    public function update(User $user, Tower $tower): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $tower);
    }

    public function delete(User $user, Tower $tower): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $tower);
    }
}
