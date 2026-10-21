<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->json('commercial_terms')->nullable()->after('payment_terms');
        });
    }

    public function down(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->dropColumn('commercial_terms');
        });
    }
};
