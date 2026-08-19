<?php

namespace App\Enums;

enum CeilingType: string
{
    case Plaster = 'plaster';
    case Pvc = 'pvc';
    case Wood = 'wood';
    case Concrete = 'concrete';
    case None = 'none';
}
