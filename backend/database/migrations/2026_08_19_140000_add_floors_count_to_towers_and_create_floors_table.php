<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('towers', function (Blueprint $table) {
            $table->unsignedSmallInteger('floors_count')->default(0)->after('sort_order');
        });

        Schema::create('floors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tower_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('number');
            $table->string('kind')->default('residential');
            $table->timestamps();

            $table->unique(['tower_id', 'number']);
            $table->index(['tower_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('floors');

        Schema::table('towers', function (Blueprint $table) {
            $table->dropColumn('floors_count');
        });
    }
};
