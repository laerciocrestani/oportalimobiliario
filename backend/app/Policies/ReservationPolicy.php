<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class ReservationPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $user->can(BuilderPermissions::CANCEL_RESERVATIONS);
    }

    public function view(User $user, Reservation $reservation): bool
    {
        return $user->can(BuilderPermissions::CANCEL_RESERVATIONS)
            && $this->sameTenant($user, $reservation);
    }

    public function cancel(User $user, Reservation $reservation): bool
    {
        return $user->can(BuilderPermissions::CANCEL_RESERVATIONS)
            && $this->sameTenant($user, $reservation);
    }

    public function viewMessages(User $user, Reservation $reservation): bool
    {
        if ($user->role === 'broker') {
            return (int) $reservation->broker_id === (int) $user->id;
        }

        return $user->can(BuilderPermissions::CANCEL_RESERVATIONS)
            && $this->sameTenant($user, $reservation);
    }

    public function reply(User $user, Reservation $reservation): bool
    {
        return $this->viewMessages($user, $reservation);
    }
}
