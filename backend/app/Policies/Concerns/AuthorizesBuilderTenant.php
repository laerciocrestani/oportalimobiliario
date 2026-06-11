<?php

namespace App\Policies\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

trait AuthorizesBuilderTenant
{
    protected function sameTenant(User $user, Model $model): bool
    {
        if ($user->tenant_id === null || ! isset($model->tenant_id)) {
            return false;
        }

        return (int) $model->tenant_id === (int) $user->tenant_id;
    }

    protected function isBuilderTeamMember(User $user, User $member): bool
    {
        return $member->role === 'builder'
            && $member->tenant_id !== null
            && (int) $member->tenant_id === (int) $user->tenant_id;
    }
}
