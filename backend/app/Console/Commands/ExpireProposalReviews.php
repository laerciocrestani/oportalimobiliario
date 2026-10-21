<?php

namespace App\Console\Commands;

use App\Services\ProposalReviewService;
use Illuminate\Console\Command;

class ExpireProposalReviews extends Command
{
    protected $signature = 'opim:expire-proposal-reviews';

    protected $description = 'Reject proposal reviews whose business-hour deadline has passed and release the unit';

    public function handle(ProposalReviewService $service): int
    {
        $count = $service->expireDueReviews();

        $this->info("Expired {$count} proposal review(s).");

        return self::SUCCESS;
    }
}
