<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case PreHold = 'pre_hold';
    case Confirmed = 'confirmed';
}
