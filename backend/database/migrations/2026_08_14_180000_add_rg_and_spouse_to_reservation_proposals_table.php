<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->string('client_rg', 20)->nullable()->after('client_cpf');
            $table->string('spouse_name')->nullable()->after('nationality');
            $table->string('spouse_phone', 20)->nullable()->after('spouse_name');
            $table->string('spouse_email')->nullable()->after('spouse_phone');
            $table->string('spouse_cpf', 11)->nullable()->after('spouse_email');
            $table->string('spouse_rg', 20)->nullable()->after('spouse_cpf');
            $table->string('spouse_nationality', 50)->nullable()->after('spouse_rg');
        });
    }

    public function down(): void
    {
        Schema::table('reservation_proposals', function (Blueprint $table) {
            $table->dropColumn([
                'client_rg',
                'spouse_name',
                'spouse_phone',
                'spouse_email',
                'spouse_cpf',
                'spouse_rg',
                'spouse_nationality',
            ]);
        });
    }
};
