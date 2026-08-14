<?php

namespace App\Enums;

enum ProposalDecision: string
{
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Returned = 'returned';
}
