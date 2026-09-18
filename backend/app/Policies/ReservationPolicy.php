<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\ReservationWitness;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class ReservationPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user): bool
    {
        return $this->isReservationManager($user)
            || $this->hasWitnessAssignments($user);
    }

    public function view(User $user, Reservation $reservation): bool
    {
        if ($this->isAssignedWitnessOn($user, $reservation)) {
            return true;
        }

        return $this->manages($user, $reservation);
    }

    public function cancel(User $user, Reservation $reservation): bool
    {
        return $this->manages($user, $reservation);
    }

    public function viewMessages(User $user, Reservation $reservation): bool
    {
        if ($user->role === 'broker') {
            return (int) $reservation->broker_id === (int) $user->id;
        }

        return $this->manages($user, $reservation);
    }

    public function reply(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->viewMessages($user, $reservation);
    }

    public function viewTimeline(User $user, Reservation $reservation): bool
    {
        if ($user->role === 'broker') {
            return (int) $reservation->broker_id === (int) $user->id;
        }

        return $this->view($user, $reservation);
    }

    public function assignWitnesses(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function signAsWitness(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly()
            && $this->isAssignedWitnessOn($user, $reservation);
    }

    public function decideProposal(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function issueProposal(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function approveDepositProof(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function extendHold(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function dropHold(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function moveKanban(User $user, Reservation $reservation): bool
    {
        if ($reservation->isSold() || $reservation->isCancelled()) {
            return $this->manages($user, $reservation);
        }

        if ($user->role === 'broker') {
            return (int) $reservation->broker_id === (int) $user->id;
        }

        return $this->manages($user, $reservation);
    }

    public function issueContract(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function uploadSignedContract(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    public function validateContract(User $user, Reservation $reservation): bool
    {
        return ! $reservation->isReadOnly() && $this->manages($user, $reservation);
    }

    private function isReservationManager(User $user): bool
    {
        return $user->can(BuilderPermissions::CANCEL_RESERVATIONS);
    }

    private function manages(User $user, Reservation $reservation): bool
    {
        return $this->isReservationManager($user) && $this->sameTenant($user, $reservation);
    }

    private function isAssignedWitnessOn(User $user, Reservation $reservation): bool
    {
        return $user->role === 'builder'
            && $this->sameTenant($user, $reservation)
            && $reservation->isAssignedWitness($user);
    }

    private function hasWitnessAssignments(User $user): bool
    {
        if ($user->role !== 'builder' || $user->tenant_id === null) {
            return false;
        }

        return ReservationWitness::query()
            ->where('user_id', $user->id)
            ->whereHas('reservation', function ($query) use ($user): void {
                $query->where('tenant_id', $user->tenant_id);
            })
            ->exists();
    }
}
