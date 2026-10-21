<?php

namespace App\Console\Commands;

use App\Services\ProposalDraftService;
use Illuminate\Console\Command;

class ExpireProposalDrafts extends Command
{
    protected $signature = 'opim:expire-proposal-drafts';

    protected $description = 'Discard proposal drafts that were not submitted within 20 minutes and release the unit';

    public function handle(ProposalDraftService $service): int
    {
        $count = $service->expireDueDrafts();

        $this->info("Expired {$count} proposal draft(s).");

        return self::SUCCESS;
    }
}
