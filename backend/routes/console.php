<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('opim:expire-reservations')->hourly()->withoutOverlapping();
Schedule::command('opim:expire-pre-reservations')->everyMinute()->withoutOverlapping();
Schedule::command('opim:check-deposit-windows')->hourly()->withoutOverlapping();
Schedule::command('opim:fetch-incc')
    ->dailyAt('08:05')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping();
Schedule::command('opim:purge-user-activity')
    ->dailyAt('03:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping();
