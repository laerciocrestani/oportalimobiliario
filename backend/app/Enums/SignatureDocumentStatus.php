<?php

namespace App\Enums;

enum SignatureDocumentStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';
}
