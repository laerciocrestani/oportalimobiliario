<?php

namespace App\Policies;

use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class TeamMemberPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_TEAM);
    }

    public function view(User $user, User $member): bool
    {
        return $user->can(BuilderPermissions::MANAGE_TEAM)
            && $this->isBuilderTeamMember($user, $member);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::MANAGE_TEAM);
    }

    public function update(User $user, User $member): bool
    {
        return $user->can(BuilderPermissions::MANAGE_TEAM)
            && $this->isBuilderTeamMember($user, $member);
    }

    public function delete(User $user, User $member): bool
    {
        if ($user->id === $member->id) {
            return false;
        }

        return $user->can(BuilderPermissions::MANAGE_TEAM)
            && $this->isBuilderTeamMember($user, $member);
    }
}
