<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->string('party_kind')->default('individual')->after('client_phone');
            $table->string('profession')->nullable()->after('nationality');
            $table->string('client_cpf', 14)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->dropColumn(['party_kind', 'profession']);
            $table->string('client_cpf', 11)->nullable()->change();
        });
    }
};
