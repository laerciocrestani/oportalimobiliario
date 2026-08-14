<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('client_name');
            $table->string('client_email');
            $table->string('client_phone');
            $table->string('client_cpf', 11);
            $table->string('address');
            $table->string('city');
            $table->string('state', 2);
            $table->string('zip', 9);
            $table->string('marital_status');
            $table->string('nationality');
            $table->decimal('land_value', 12, 2);
            $table->text('payment_terms');
            $table->string('decision')->nullable();
            $table->text('decision_note')->nullable();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['reservation_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_proposals');
    }
};
