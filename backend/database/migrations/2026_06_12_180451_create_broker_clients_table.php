<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broker_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('broker_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->timestamps();

            $table->index('broker_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broker_clients');
    }
};
