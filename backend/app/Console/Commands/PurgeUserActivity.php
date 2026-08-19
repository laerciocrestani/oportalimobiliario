<?php

namespace App\Console\Commands;

use App\Models\UserActivityEvent;
use Illuminate\Console\Command;

/**
 * @see REQ-LOG-012
 */
class PurgeUserActivity extends Command
{
    protected $signature = 'opim:purge-user-activity';

    protected $description = 'Delete user activity events older than five years';

    public function handle(): int
    {
        $count = UserActivityEvent::purgeOlderThan(now()->subYears(5));

        $this->info("Purged {$count} user activity event(s).");

        return self::SUCCESS;
    }
}
