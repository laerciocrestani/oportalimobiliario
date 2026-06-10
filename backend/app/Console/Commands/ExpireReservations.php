<?php

namespace App\Console\Commands;

use App\Services\ReservationExpirationService;
use Illuminate\Console\Command;

class ExpireReservations extends Command
{
    protected $signature = 'opim:expire-reservations';

    protected $description = 'Expire reservations whose TTL has been reached';

    public function handle(ReservationExpirationService $service): int
    {
        $count = $service->expireDueReservations();

        $this->info("Expired {$count} reservation(s).");

        return self::SUCCESS;
    }
}
