<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ReservationPendingReplyService
{
    public function needsReplyFromUser(Reservation $reservation, User $user): bool
    {
        $latestMessage = $reservation->messages()
            ->with('user:id,role')
            ->latest('id')
            ->first();

        if ($latestMessage === null) {
            return false;
        }

        return $latestMessage->user->role !== $user->role;
    }

    public function countForBuilder(): int
    {
        return $this->countWhereLatestMessageFromRole(
            Reservation::query()->listed(),
            'broker',
        );
    }

    public function countForBroker(User $broker): int
    {
        return $this->countWhereLatestMessageFromRole(
            Reservation::query()
                ->withoutGlobalScope('tenant')
                ->listed()
                ->where('broker_id', $broker->id),
            'builder',
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function formatListItem(Reservation $reservation, User $viewer): array
    {
        return [
            'id' => $reservation->id,
            'status' => $reservation->status->value,
            'created_at' => $reservation->created_at,
            'expires_at' => $reservation->expires_at,
            'messages_count' => $reservation->messages_count ?? $reservation->messages()->count(),
            'needs_reply' => $this->needsReplyFromUser($reservation, $viewer),
            'needs_proposal_decision' => $reservation->isProposalPending(),
            'needs_deposit_proof_approval' => $reservation->isDepositProofPending(),
            'deposit_overdue' => $reservation->timelineEvents()
                ->where('type', \App\Enums\ReservationTimelineEventType::DepositOverdue)
                ->exists(),
            'client' => $reservation->client ? [
                'id' => $reservation->client->id,
                'name' => $reservation->client->name,
            ] : null,
            'broker' => $reservation->broker ? [
                'id' => $reservation->broker->id,
                'name' => $reservation->broker->name,
            ] : null,
            'unit' => $reservation->unit ? [
                'id' => $reservation->unit->id,
                'code' => $reservation->unit->code,
                'building' => $reservation->unit->building ? [
                    'id' => $reservation->unit->building->id,
                    'name' => $reservation->unit->building->name,
                ] : null,
            ] : null,
        ];
    }

    private function countWhereLatestMessageFromRole(Builder $reservationsQuery, string $latestAuthorRole): int
    {
        $reservationIds = (clone $reservationsQuery)->pluck('id');

        if ($reservationIds->isEmpty()) {
            return 0;
        }

        $latestMessageIds = ReservationMessage::query()
            ->select(DB::raw('MAX(id) as id'))
            ->whereIn('reservation_id', $reservationIds)
            ->groupBy('reservation_id')
            ->pluck('id');

        if ($latestMessageIds->isEmpty()) {
            return 0;
        }

        return ReservationMessage::query()
            ->whereIn('id', $latestMessageIds)
            ->whereHas('user', fn (Builder $query) => $query->where('role', $latestAuthorRole))
            ->count();
    }
}
