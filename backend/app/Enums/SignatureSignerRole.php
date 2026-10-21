<?php

namespace App\Enums;

enum SignatureSignerRole: string
{
    case Buyer = 'buyer';
    case Builder = 'builder';
    case Broker = 'broker';
    case Witness = 'witness';
}
