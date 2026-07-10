<?php

namespace App\Support;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Unit;

class BrokerUnitSerializer
{
    /**
     * @return array<string, mixed>
     */
    public static function serialize(Unit $unit, int $brokerId): array
    {
        $payload = $unit->toArray();
        $reservation = $unit->relationLoaded('reservation') ? $unit->reservation : null;

        unset($payload['reservation']);

        if ($reservation === null) {
            return $payload;
        }

        if ($reservation->status === ReservationStatus::PreHold) {
            $payload['pre_hold'] = [
                'reservation_id' => $reservation->id,
                'expires_at' => $reservation->expires_at?->toIso8601String(),
                'held_by_me' => (int) $reservation->broker_id === $brokerId,
            ];

            if ((int) $reservation->broker_id === $brokerId) {
                $payload['reservation'] = [
                    'id' => $reservation->id,
                    'unit_id' => $reservation->unit_id,
                    'broker_id' => $reservation->broker_id,
                    'status' => $reservation->status->value,
                    'expires_at' => $reservation->expires_at?->toIso8601String(),
                ];
            }

            return $payload;
        }

        if ($reservation->status === ReservationStatus::Confirmed
            && (int) $reservation->broker_id === $brokerId) {
            $payload['reservation'] = $reservation->toArray();
        }

        return $payload;
    }
}
