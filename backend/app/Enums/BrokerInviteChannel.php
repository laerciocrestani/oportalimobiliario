<?php

namespace App\Enums;

enum BrokerInviteChannel: string
{
    case Email = 'email';
    case WhatsApp = 'whatsapp';
    case Link = 'link';
}
