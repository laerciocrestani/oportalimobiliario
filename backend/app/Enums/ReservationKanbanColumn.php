<?php

namespace App\Enums;

enum ReservationKanbanColumn: string
{
    case PreReservation = 'pre_reservation';
    case ProposalReview = 'proposal_review';
    case ProposalFormalization = 'proposal_formalization';
    case DocsDeposit = 'docs_deposit';
    case Contract = 'contract';
    case Sold = 'sold';
    case Cancelled = 'cancelled';

    /**
     * @return list<self>
     */
    public static function ordered(): array
    {
        return self::cases();
    }

    public function label(): string
    {
        return match ($this) {
            self::PreReservation => 'Pré-reserva/Diálogo',
            self::ProposalReview => 'Proposta em análise',
            self::ProposalFormalization => 'Proposta aceita/Formalização',
            self::DocsDeposit => 'Documentação & Sinal',
            self::Contract => 'Contrato (assinaturas)',
            self::Sold => 'Vendida',
            self::Cancelled => 'Cancelada',
        };
    }
}
