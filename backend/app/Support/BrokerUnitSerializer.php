<?php

namespace App\Support;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Unit;

/**
 * @see REQ-WIZ-009
 * @see REQ-WIZ-011
 * @see REQ-WIZ-016
 */
class BrokerUnitSerializer
{
    /**
     * @return array<string, mixed>
     */
    public static function serialize(Unit $unit, int $brokerId): array
    {
        AmenityPresentation::decorateUnit($unit, $unit->building);

        $payload = $unit->toArray();
        $reservation = $unit->relationLoaded('reservation') ? $unit->reservation : null;

        unset($payload['reservation']);

        if ($reservation === null) {
            return $payload;
        }

        $isOwner = (int) $reservation->broker_id === $brokerId;
        $isPreReservedFlow = in_array($reservation->status, [
            ReservationStatus::PreHold,
            ReservationStatus::ProposalPending,
            ReservationStatus::ProposalReturned,
        ], true);

        if ($isPreReservedFlow) {
            $payload['pre_hold'] = [
                'reservation_id' => $reservation->id,
                'expires_at' => $reservation->expires_at?->toIso8601String(),
                'held_by_me' => $isOwner,
            ];

            if ($isOwner) {
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

        if ($reservation->isDepositPending() && $isOwner) {
            $payload['reservation'] = $reservation->toArray();
        }

        return $payload;
    }
}
