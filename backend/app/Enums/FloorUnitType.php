<?php

namespace App\Enums;

enum FloorUnitType: string
{
    case Apartment = 'apartment';
    case Penthouse = 'penthouse';
    case Duplex = 'duplex';
    case Triplex = 'triplex';
    case Garden = 'garden';
    case Loft = 'loft';
    case Studio = 'studio';
    case Flat = 'flat';
    case Store = 'store';
}
