<?php

namespace App\Support;

use App\Enums\ReservationStatus;
use App\Models\Unit;
use App\Services\ReservationGarageService;

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

        $unit->loadMissing('floorRecord');
        $payload['floor_kind'] = $unit->floorRecord?->kind?->value;

        if ($reservation === null) {
            return $payload;
        }

        $isOwner = (int) $reservation->broker_id === $brokerId;
        $isPreReservedFlow = in_array($reservation->status, [
            ReservationStatus::PreHold,
            ReservationStatus::ProposalDraft,
            ReservationStatus::ProposalPending,
            ReservationStatus::ProposalReturned,
        ], true);

        if ($isPreReservedFlow) {
            $expiresAt = $reservation->isProposalDraft()
                ? $reservation->draft_expires_at
                : $reservation->expires_at;

            $payload['pre_hold'] = [
                'reservation_id' => $reservation->id,
                'expires_at' => $expiresAt?->toIso8601String(),
                'held_by_me' => $isOwner,
            ];

            if ($isOwner) {
                $payload['reservation'] = [
                    'id' => $reservation->id,
                    'unit_id' => $reservation->unit_id,
                    'broker_id' => $reservation->broker_id,
                    'client_id' => $reservation->client_id,
                    'status' => $reservation->status->value,
                    'expires_at' => $expiresAt?->toIso8601String(),
                    'client' => $reservation->client,
                    'garage_units' => ReservationGarageService::serializeGarageUnits($reservation),
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
