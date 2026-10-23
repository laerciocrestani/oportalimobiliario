<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signature_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->string('kind');
            $table->string('reference')->unique();
            $table->string('provider_document_id')->nullable()->unique();
            $table->string('status');
            $table->text('error')->nullable();
            $table->timestamps();

            $table->unique(['reservation_id', 'kind']);
        });

        Schema::create('signature_signers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('signature_document_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('status');
            $table->string('provider_signer_id')->nullable()->index();
            $table->text('sign_url')->nullable();
            $table->timestamps();

            $table->unique(['signature_document_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signature_signers');
        Schema::dropIfExists('signature_documents');
    }
};
