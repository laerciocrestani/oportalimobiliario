<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incc_indices', function (Blueprint $table) {
            $table->id();
            $table->date('competence')->unique();
            $table->decimal('value', 12, 6);
            $table->string('source')->default('manual');
            $table->timestamp('fetched_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incc_indices');
    }
};
