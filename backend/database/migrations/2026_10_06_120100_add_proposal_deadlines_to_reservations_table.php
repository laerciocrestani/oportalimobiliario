<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('draft_expires_at')->nullable()->index()->after('expires_at');
            $table->timestamp('review_deadline_at')->nullable()->after('draft_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['draft_expires_at', 'review_deadline_at']);
        });
    }
};
