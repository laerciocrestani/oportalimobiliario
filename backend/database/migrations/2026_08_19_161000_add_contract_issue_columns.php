<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            if (! Schema::hasColumn('units', 'frozen_price_brl')) {
                $table->decimal('frozen_price_brl', 12, 2)->nullable()->after('price');
            }
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->foreignId('contract_template_id')
                ->nullable()
                ->after('status')
                ->constrained('contract_templates')
                ->nullOnDelete();
            $table->json('contract_values')->nullable()->after('contract_template_id');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('contract_template_id');
            $table->dropColumn('contract_values');
        });

        Schema::table('units', function (Blueprint $table) {
            if (Schema::hasColumn('units', 'frozen_price_brl')) {
                $table->dropColumn('frozen_price_brl');
            }
        });
    }
};
