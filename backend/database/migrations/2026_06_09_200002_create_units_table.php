<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('building_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->unsignedSmallInteger('floor')->nullable();
            $table->decimal('area_m2', 10, 2)->nullable();
            $table->decimal('price', 14, 2)->nullable();
            $table->string('status')->default('available');
            $table->timestamps();

            $table->unique(['building_id', 'code']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
