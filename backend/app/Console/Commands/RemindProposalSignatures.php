<?php

namespace App\Console\Commands;

use App\Services\SignatureLinkNotifier;
use Illuminate\Console\Command;

class RemindProposalSignatures extends Command
{
    protected $signature = 'opim:remind-proposal-signatures';

    protected $description = 'Remind proposal and contract signers who have not signed and were not notified today';

    public function handle(SignatureLinkNotifier $links): int
    {
        $count = $links->remindOutstanding();

        $this->info("Reminded {$count} signer(s).");

        return self::SUCCESS;
    }
}
