<?php

namespace App\Jobs;

use App\Services\ProposalSignatureService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * @see REQ-RDP-006
 */
class SendProposalToZapSign implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $reservationId) {}

    public function handle(ProposalSignatureService $signatures): void
    {
        $signatures->send($this->reservationId);
    }
}
