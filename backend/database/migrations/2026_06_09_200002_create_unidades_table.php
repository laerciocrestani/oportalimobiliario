<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained()->cascadeOnDelete();
            $table->string('codigo');
            $table->unsignedSmallInteger('andar')->nullable();
            $table->decimal('area_m2', 10, 2)->nullable();
            $table->decimal('preco', 14, 2)->nullable();
            $table->string('status')->default('disponivel');
            $table->timestamps();

            $table->unique(['empreendimento_id', 'codigo']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unidades');
    }
};
