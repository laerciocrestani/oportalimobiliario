<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->foreignId('tower_id')->nullable()->after('building_id')->constrained()->cascadeOnDelete();
        });

        $now = now();

        DB::table('buildings')->orderBy('id')->each(function (object $building) use ($now): void {
            $towerId = DB::table('towers')->insertGetId([
                'tenant_id' => $building->tenant_id,
                'building_id' => $building->id,
                'name' => 'Torre única',
                'sort_order' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('units')
                ->where('building_id', $building->id)
                ->update(['tower_id' => $towerId]);
        });

        Schema::table('units', function (Blueprint $table) {
            $table->dropUnique(['building_id', 'code']);
            $table->unique(['tower_id', 'code']);
            $table->foreignId('tower_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropUnique(['tower_id', 'code']);
            $table->dropConstrainedForeignId('tower_id');
            $table->unique(['building_id', 'code']);
        });
    }
};
