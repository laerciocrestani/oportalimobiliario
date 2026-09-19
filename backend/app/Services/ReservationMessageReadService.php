<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\ReservationMessageRead;
use App\Models\User;

/**
 * @see REQ-RKQ-002
 */
class ReservationMessageReadService
{
    public function unreadCount(Reservation $reservation, User $viewer): int
    {
        $lastReadId = $this->lastReadMessageId($reservation, $viewer);
        $messages = $reservation->relationLoaded('messages')
            ? $reservation->messages
            : $reservation->messages()->with('user:id,role')->get();

        return $messages
            ->filter(function ($message) use ($viewer, $lastReadId): bool {
                if ($message->user === null || $message->user->role === $viewer->role) {
                    return false;
                }

                return $lastReadId === null || (int) $message->id > $lastReadId;
            })
            ->count();
    }

    public function markRead(Reservation $reservation, User $viewer): void
    {
        $maxId = $reservation->messages()->max('id');

        ReservationMessageRead::query()->updateOrCreate(
            [
                'reservation_id' => $reservation->id,
                'user_id' => $viewer->id,
            ],
            [
                'last_read_message_id' => $maxId,
            ],
        );
    }

    private function lastReadMessageId(Reservation $reservation, User $viewer): ?int
    {
        if ($reservation->relationLoaded('messageReads')) {
            $read = $reservation->messageReads->firstWhere('user_id', $viewer->id)
                ?? $reservation->messageReads->first();

            return $read?->last_read_message_id === null ? null : (int) $read->last_read_message_id;
        }

        $value = ReservationMessageRead::query()
            ->where('reservation_id', $reservation->id)
            ->where('user_id', $viewer->id)
            ->value('last_read_message_id');

        return $value === null ? null : (int) $value;
    }
}
