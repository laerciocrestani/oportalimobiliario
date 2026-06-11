<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class ReservationPolicy
{
    use AuthorizesBuilderTenant;

    public function cancel(User $user, Reservation $reservation): bool
    {
        return $user->can(BuilderPermissions::CANCEL_RESERVATIONS)
            && $this->sameTenant($user, $reservation);
    }
}
