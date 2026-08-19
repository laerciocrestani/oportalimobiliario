<?php

use App\Services\UnitFloorBackfill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->string('ceiling_type')->nullable()->after('state');
            $table->string('opening_type')->nullable()->after('ceiling_type');
            $table->string('flooring_type')->nullable()->after('opening_type');
            $table->string('solar_position')->nullable()->after('flooring_type');
            $table->string('sun_period')->nullable()->after('solar_position');
        });

        Schema::table('units', function (Blueprint $table) {
            $table->decimal('private_area_m2', 10, 2)->nullable()->after('area_m2');
            $table->decimal('total_area_m2', 10, 2)->nullable()->after('private_area_m2');
            $table->unsignedTinyInteger('bedrooms')->nullable()->after('total_area_m2');
            $table->unsignedTinyInteger('bathrooms')->nullable()->after('bedrooms');
            $table->unsignedTinyInteger('suites')->nullable()->after('bathrooms');
            $table->unsignedTinyInteger('powder_rooms')->nullable()->after('suites');
            $table->unsignedTinyInteger('balconies')->nullable()->after('powder_rooms');
            $table->string('solar_position')->nullable()->after('balconies');
            $table->string('sun_period')->nullable()->after('solar_position');
            $table->string('property_position')->nullable()->after('sun_period');
            $table->string('ceiling_type')->nullable()->after('property_position');
            $table->string('opening_type')->nullable()->after('ceiling_type');
            $table->string('flooring_type')->nullable()->after('opening_type');
            $table->decimal('price_base', 14, 2)->nullable()->after('price');
            $table->date('price_competence')->nullable()->after('price_base');
        });

        DB::table('units')->whereNotNull('area_m2')->update([
            'private_area_m2' => DB::raw('area_m2'),
        ]);

        DB::table('units')->whereNotNull('price')->update([
            'price_base' => DB::raw('price'),
        ]);

        app(UnitFloorBackfill::class)->run();
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropColumn([
                'private_area_m2',
                'total_area_m2',
                'bedrooms',
                'bathrooms',
                'suites',
                'powder_rooms',
                'balconies',
                'solar_position',
                'sun_period',
                'property_position',
                'ceiling_type',
                'opening_type',
                'flooring_type',
                'price_base',
                'price_competence',
            ]);
        });

        Schema::table('buildings', function (Blueprint $table) {
            $table->dropColumn([
                'ceiling_type',
                'opening_type',
                'flooring_type',
                'solar_position',
                'sun_period',
            ]);
        });
    }
};
