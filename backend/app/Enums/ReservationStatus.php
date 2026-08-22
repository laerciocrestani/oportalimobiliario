<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case PreHold = 'pre_hold';
    case ProposalPending = 'proposal_pending';
    case ProposalReturned = 'proposal_returned';
    case DepositPending = 'deposit_pending';
    case DepositProofPending = 'deposit_proof_pending';
    case ContractDataPending = 'contract_data_pending';
    case ContractIssued = 'contract_issued';
    case ContractUploaded = 'contract_uploaded';
    case ContractBuilderSigned = 'contract_builder_signed';
    case Sold = 'sold';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
}
