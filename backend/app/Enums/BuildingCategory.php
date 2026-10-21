<?php

namespace App\Enums;

enum BuildingCategory: string
{
    case Residential = 'residential';
    case Commercial = 'commercial';
    case Mixed = 'mixed';
}
