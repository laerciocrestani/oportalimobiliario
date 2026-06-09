<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acessos_unidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('corretor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('unidade_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['corretor_id', 'unidade_id']);
            $table->index(['tenant_id', 'corretor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acessos_unidades');
    }
};
