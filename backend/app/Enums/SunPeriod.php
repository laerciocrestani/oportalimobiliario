<?php

namespace App\Enums;

enum SunPeriod: string
{
    case Morning = 'morning';
    case Afternoon = 'afternoon';
    case FullDay = 'full_day';
}
