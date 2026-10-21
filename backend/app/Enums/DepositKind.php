<?php

namespace App\Enums;

enum DepositKind: string
{
    case Pix = 'pix';
    case Asset = 'asset';
}
