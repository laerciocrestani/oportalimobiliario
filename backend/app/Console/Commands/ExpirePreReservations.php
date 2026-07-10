<?php

namespace App\Console\Commands;

use App\Services\PreReservationService;
use Illuminate\Console\Command;

class ExpirePreReservations extends Command
{
    protected $signature = 'opim:expire-pre-reservations';

    protected $description = 'Expire pre-hold reservations whose TTL has been reached';

    public function handle(PreReservationService $service): int
    {
        $count = $service->expireDuePreHolds();

        $this->info("Expired {$count} pre-hold reservation(s).");

        return self::SUCCESS;
    }
}
