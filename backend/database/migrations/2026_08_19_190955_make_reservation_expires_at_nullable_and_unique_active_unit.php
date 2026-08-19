<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropUnique(['unit_id']);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->change();
        });

        DB::statement(
            "CREATE UNIQUE INDEX reservations_active_unit_unique ON reservations (unit_id) WHERE status <> 'cancelled'",
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS reservations_active_unit_unique');

        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable(false)->change();
            $table->unique('unit_id');
        });
    }
};
