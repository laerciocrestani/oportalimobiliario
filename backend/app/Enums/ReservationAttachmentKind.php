<?php

namespace App\Enums;

enum ReservationAttachmentKind: string
{
    case DepositProof = 'deposit_proof';
    case ContractDocumentation = 'contract_documentation';
    case ContractPdf = 'contract_pdf';
    case ContractSigned = 'contract_signed';
}
