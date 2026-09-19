<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_message_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('last_read_message_id')
                ->nullable()
                ->constrained('reservation_messages')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['reservation_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_message_reads');
    }
};
