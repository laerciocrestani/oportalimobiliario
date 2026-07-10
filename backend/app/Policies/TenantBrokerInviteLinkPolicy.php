<?php

namespace App\Policies;

use App\Models\TenantBrokerInviteLink;
use App\Models\User;
use App\Support\BuilderPermissions;

class TenantBrokerInviteLinkPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::SEND_INVITES);
    }

    public function regenerate(User $user): bool
    {
        return $user->can(BuilderPermissions::SEND_INVITES);
    }

    public function approvePending(User $user): bool
    {
        return $user->can(BuilderPermissions::SEND_INVITES);
    }
}
