<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->string('deposit_kind')->default('pix')->after('payment_terms');
        });
    }

    public function down(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->dropColumn('deposit_kind');
        });
    }
};
