<?php

use App\Enums\ReservationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $hours = (int) config('opim.pre_reservation_hold_hours', 48);

        DB::table('reservations')
            ->where('status', ReservationStatus::PreHold->value)
            ->whereNotNull('client_id')
            ->whereNull('expires_at')
            ->update([
                'expires_at' => now()->addHours($hours),
            ]);
    }

    public function down(): void
    {
        DB::table('reservations')
            ->where('status', ReservationStatus::PreHold->value)
            ->whereNotNull('client_id')
            ->update([
                'expires_at' => null,
            ]);
    }
};
