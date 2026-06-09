<?php

namespace App\Console\Commands;

use App\Services\ReservaExpirationService;
use Illuminate\Console\Command;

class ExpireReservas extends Command
{
    protected $signature = 'opim:expire-reservas';

    protected $description = 'Expira reservas soft cujo TTL foi atingido';

    public function handle(ReservaExpirationService $service): int
    {
        $count = $service->expireDueReservas();

        $this->info("Expiradas {$count} reserva(s).");

        return self::SUCCESS;
    }
}
