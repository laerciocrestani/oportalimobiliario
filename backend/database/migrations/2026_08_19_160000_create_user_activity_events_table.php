<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_activity_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('action');
            $table->string('resource_type')->nullable();
            $table->unsignedBigInteger('resource_id')->nullable();
            $table->text('message');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->foreignId('impersonator_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('impersonated_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['actor_user_id', 'created_at']);
            $table->index(['tenant_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_activity_events');
    }
};
