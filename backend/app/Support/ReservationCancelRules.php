<?php

namespace App\Support;

class ReservationCancelRules
{
    /**
     * @return array<string, mixed>
     */
    public static function payload(): array
    {
        return [
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
