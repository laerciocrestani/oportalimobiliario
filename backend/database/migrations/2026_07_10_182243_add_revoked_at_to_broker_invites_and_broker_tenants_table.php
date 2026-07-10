<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broker_invites', function (Blueprint $table) {
            $table->timestamp('revoked_at')->nullable()->after('declined_at');
        });

        Schema::table('broker_tenants', function (Blueprint $table) {
            $table->timestamp('revoked_at')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('broker_tenants', function (Blueprint $table) {
            $table->dropColumn('revoked_at');
        });

        Schema::table('broker_invites', function (Blueprint $table) {
            $table->dropColumn('revoked_at');
        });
    }
};
