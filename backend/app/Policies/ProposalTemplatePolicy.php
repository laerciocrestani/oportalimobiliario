<?php

namespace App\Policies;

use App\Models\ProposalTemplate;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class ProposalTemplatePolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_PROPOSALS);
    }

    public function view(User $user, ProposalTemplate $proposalTemplate): bool
    {
        return $user->can(BuilderPermissions::MANAGE_PROPOSALS)
            && $this->sameTenant($user, $proposalTemplate);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_PROPOSALS);
    }

    public function update(User $user, ProposalTemplate $proposalTemplate): bool
    {
        return $user->can(BuilderPermissions::MANAGE_PROPOSALS)
            && $this->sameTenant($user, $proposalTemplate);
    }

    public function delete(User $user, ProposalTemplate $proposalTemplate): bool
    {
        return $user->can(BuilderPermissions::MANAGE_PROPOSALS)
            && $this->sameTenant($user, $proposalTemplate);
    }
}
