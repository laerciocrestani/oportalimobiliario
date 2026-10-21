<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('signature_signers', function (Blueprint $table) {
            $table->string('signer_key')->nullable()->after('role');
        });

        DB::table('signature_signers')->whereNull('signer_key')->update([
            'signer_key' => DB::raw('role'),
        ]);

        Schema::table('signature_signers', function (Blueprint $table) {
            $table->dropUnique(['signature_document_id', 'role']);
            $table->unique(['signature_document_id', 'signer_key']);
        });
    }

    public function down(): void
    {
        Schema::table('signature_signers', function (Blueprint $table) {
            $table->dropUnique(['signature_document_id', 'signer_key']);
            $table->unique(['signature_document_id', 'role']);
            $table->dropColumn('signer_key');
        });
    }
};
