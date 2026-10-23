<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_signature_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('proposal_signer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('tenant_signature_witness_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('signature_setting_id')->constrained('tenant_signature_settings')->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('kind');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_signature_witness_slots');
        Schema::dropIfExists('tenant_signature_settings');
    }
};
