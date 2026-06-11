<?php

namespace App\Enums;

enum UnitStatus: string
{
    case Available = 'available';
    case PreReserved = 'pre_reserved';
    case Reserved = 'reserved';
    case Sold = 'sold';
    case Unavailable = 'unavailable';
}
