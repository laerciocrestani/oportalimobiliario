<?php

namespace App\Console\Commands;

use App\Services\PreReservationService;
use Illuminate\Console\Command;

class ExpirePreReservations extends Command
{
    protected $signature = 'opim:expire-pre-reservations';

    protected $description = 'Expire due pre-holds (10 min draft) and stalled client pre-reservations (48h hold)';

    public function handle(PreReservationService $service): int
    {
        $count = $service->expireDuePreHolds();

        $this->info("Expired {$count} pre-hold reservation(s).");

        return self::SUCCESS;
    }
}
