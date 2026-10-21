<?php

use App\Services\PreReservationService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        app(PreReservationService::class)->cancelLegacyPreHolds();
    }

    public function down(): void
    {
        // Pré-reservas canceladas nesta entrada não voltam ao fluxo antigo.
    }
};
