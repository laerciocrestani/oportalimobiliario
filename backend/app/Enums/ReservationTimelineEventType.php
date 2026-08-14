<?php

namespace App\Enums;

enum ReservationTimelineEventType: string
{
    case PreHoldCreated = 'pre_hold_created';
    case Dialogue = 'dialogue';
    case ProposalSubmitted = 'proposal_submitted';
    case ProposalAccepted = 'proposal_accepted';
    case ProposalRejected = 'proposal_rejected';
    case ProposalReturned = 'proposal_returned';
    case DepositWindowOpened = 'deposit_window_opened';
    case DepositOverdue = 'deposit_overdue';
    case DepositProofSubmitted = 'deposit_proof_submitted';
    case DepositProofApproved = 'deposit_proof_approved';
    case ContractDataSubmitted = 'contract_data_submitted';
    case ContractIssued = 'contract_issued';
    case ContractSignedGov = 'contract_signed_gov';
    case ContractUploaded = 'contract_uploaded';
    case ContractValidated = 'contract_validated';
    case Sold = 'sold';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
}
