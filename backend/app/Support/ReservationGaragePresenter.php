<?php

namespace App\Support;

use App\Models\Reservation;
use App\Services\ReservationGarageService;

/**
 * Merge garage_units into a reservation JSON payload (array or model toArray).
 *
 * @see REQ-RGS-002
 */
class ReservationGaragePresenter
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function withGarageUnits(array $payload, Reservation $reservation): array
    {
        $payload['garage_units'] = ReservationGarageService::serializeGarageUnits($reservation);

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromReservation(Reservation $reservation): array
    {
        return self::withGarageUnits($reservation->toArray(), $reservation);
    }
}
