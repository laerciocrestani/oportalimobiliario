<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->index('client_cpf');
        });
    }

    public function down(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->dropIndex(['client_cpf']);
        });
    }
};
