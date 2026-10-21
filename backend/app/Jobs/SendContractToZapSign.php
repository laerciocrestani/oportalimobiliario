<?php

namespace App\Jobs;

use App\Services\ContractSignatureService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * @see REQ-RDP-010
 */
class SendContractToZapSign implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $reservationId) {}

    public function handle(ContractSignatureService $signatures): void
    {
        $signatures->send($this->reservationId);
    }
}
