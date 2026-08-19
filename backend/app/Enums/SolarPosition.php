<?php

namespace App\Enums;

enum SolarPosition: string
{
    case North = 'north';
    case Northeast = 'northeast';
    case East = 'east';
    case Southeast = 'southeast';
    case South = 'south';
    case Southwest = 'southwest';
    case West = 'west';
    case Northwest = 'northwest';
}
