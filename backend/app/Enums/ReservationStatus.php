<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case PreHold = 'pre_hold';
    case ProposalDraft = 'proposal_draft';
    case ProposalPending = 'proposal_pending';
    case ProposalSigning = 'proposal_signing';
    case ProposalReturned = 'proposal_returned';
    case DepositPending = 'deposit_pending';
    case DepositProofPending = 'deposit_proof_pending';
    case ContractDataPending = 'contract_data_pending';
    case ContractIssued = 'contract_issued';
    case ContractSigning = 'contract_signing';
    case ContractUploaded = 'contract_uploaded';
    case ContractBuilderSigned = 'contract_builder_signed';
    case Sold = 'sold';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
}
