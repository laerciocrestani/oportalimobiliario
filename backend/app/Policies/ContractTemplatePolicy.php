<?php

namespace App\Policies;

use App\Models\ContractTemplate;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class ContractTemplatePolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_CONTRACTS);
    }

    public function view(User $user, ContractTemplate $contractTemplate): bool
    {
        return $user->can(BuilderPermissions::MANAGE_CONTRACTS)
            && $this->sameTenant($user, $contractTemplate);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_CONTRACTS);
    }

    public function update(User $user, ContractTemplate $contractTemplate): bool
    {
        return $user->can(BuilderPermissions::MANAGE_CONTRACTS)
            && $this->sameTenant($user, $contractTemplate);
    }

    public function delete(User $user, ContractTemplate $contractTemplate): bool
    {
        return $user->can(BuilderPermissions::MANAGE_CONTRACTS)
            && $this->sameTenant($user, $contractTemplate);
    }
}
