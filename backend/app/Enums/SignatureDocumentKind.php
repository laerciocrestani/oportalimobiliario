<?php

namespace App\Enums;

enum SignatureDocumentKind: string
{
    case Proposal = 'proposal';
    case Contract = 'contract';
}
