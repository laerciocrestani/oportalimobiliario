<?php

namespace App\Console\Commands;

use App\Services\ReservationDepositService;
use Illuminate\Console\Command;

class CheckDepositWindows extends Command
{
    protected $signature = 'opim:check-deposit-windows';

    protected $description = 'Alert overdue deposit windows without cancelling reservations';

    public function handle(ReservationDepositService $service): int
    {
        $count = $service->checkOverdueDepositWindows();

        $this->info("Marked {$count} reservation(s) with deposit overdue alert.");

        return self::SUCCESS;
    }
}
