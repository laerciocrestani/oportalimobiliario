<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('opim:expire-reservations')->hourly();
Schedule::command('opim:expire-pre-reservations')->everyMinute();
Schedule::command('opim:check-deposit-windows')->hourly();
Schedule::command('opim:fetch-incc')
    ->dailyAt('08:05')
    ->timezone('America/Sao_Paulo');
