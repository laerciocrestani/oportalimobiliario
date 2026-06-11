<?php

namespace App\Policies;

use App\Models\BrokerInvite;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class BrokerInvitePolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::SEND_INVITES);
    }

    public function view(User $user, BrokerInvite $brokerInvite): bool
    {
        return $user->can(BuilderPermissions::SEND_INVITES)
            && $this->sameTenant($user, $brokerInvite);
    }

    public function create(User $user): bool
    {
        return $user->can(BuilderPermissions::SEND_INVITES);
    }
}
