<?php

namespace App\Enums;

enum FlooringType: string
{
    case Porcelain = 'porcelain';
    case Ceramic = 'ceramic';
    case Wood = 'wood';
    case Vinyl = 'vinyl';
    case Laminate = 'laminate';
    case PolishedConcrete = 'polished_concrete';
}
