<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('floors', function (Blueprint $table) {
            $table->smallInteger('number')->change();
            $table->boolean('customized')->default(false)->after('kind');
        });

        Schema::table('towers', function (Blueprint $table) {
            $table->smallInteger('reference_floor')->nullable()->after('floors_count');
        });
    }

    public function down(): void
    {
        Schema::table('floors', function (Blueprint $table) {
            $table->unsignedSmallInteger('number')->change();
            $table->dropColumn('customized');
        });

        Schema::table('towers', function (Blueprint $table) {
            $table->dropColumn('reference_floor');
        });
    }
};
