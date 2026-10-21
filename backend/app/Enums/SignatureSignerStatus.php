<?php

namespace App\Enums;

enum SignatureSignerStatus: string
{
    case Pending = 'pending';
    case Signed = 'signed';
    case Refused = 'refused';
}
