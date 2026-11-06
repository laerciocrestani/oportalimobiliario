<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broker_building_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('broker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('building_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['broker_id', 'building_id']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broker_building_requests');
    }
};
