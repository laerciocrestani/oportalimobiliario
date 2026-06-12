<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broker_tenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('broker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('broker_invite_id')->nullable()->constrained('broker_invites')->nullOnDelete();
            $table->timestamp('accepted_at');
            $table->timestamps();

            $table->unique(['tenant_id', 'broker_id']);
            $table->index(['broker_id', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broker_tenants');
    }
};
