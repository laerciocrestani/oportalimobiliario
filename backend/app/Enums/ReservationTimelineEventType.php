<?php

namespace App\Enums;

enum ReservationTimelineEventType: string
{
    case PreHoldCreated = 'pre_hold_created';
    case Dialogue = 'dialogue';
    case ProposalSubmitted = 'proposal_submitted';
    case ProposalPdfIssued = 'proposal_pdf_issued';
    case ProposalAccepted = 'proposal_accepted';
    case ProposalRejected = 'proposal_rejected';
    case ProposalReturned = 'proposal_returned';
    case ProposalSignedBoth = 'proposal_signed_both';
    case DepositWindowOpened = 'deposit_window_opened';
    case DepositOverdue = 'deposit_overdue';
    case DepositProofSubmitted = 'deposit_proof_submitted';
    case DepositProofApproved = 'deposit_proof_approved';
    case ContractDataSubmitted = 'contract_data_submitted';
    case ContractIssued = 'contract_issued';
    case ContractSignedGov = 'contract_signed_gov';
    case ContractUploaded = 'contract_uploaded';
    case ContractBuilderSigned = 'contract_builder_signed';
    case ContractWitnessesAssigned = 'contract_witnesses_assigned';
    case ContractWitness1Signed = 'contract_witness_1_signed';
    case ContractWitness2Signed = 'contract_witness_2_signed';
    case ContractValidated = 'contract_validated';
    case Sold = 'sold';
    case HoldExtended = 'hold_extended';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
}
