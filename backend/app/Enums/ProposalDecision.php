<?php

namespace App\Enums;

enum ProposalDecision: string
{
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Returned = 'returned';

    public function requiresNote(): bool
    {
        return $this === self::Rejected || $this === self::Returned;
    }

    public function dialogueMessage(string $note): ?string
    {
        return match ($this) {
            self::Rejected => 'Proposta recusada: '.$note,
            self::Returned => 'Proposta devolvida: '.$note,
            self::Accepted => null,
        };
    }
}
