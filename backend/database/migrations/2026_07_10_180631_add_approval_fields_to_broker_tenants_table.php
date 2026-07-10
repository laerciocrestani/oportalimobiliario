<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broker_tenants', function (Blueprint $table) {
            $table->timestamp('approved_at')->nullable()->after('accepted_at');
            $table->foreignId('tenant_broker_invite_link_id')
                ->nullable()
                ->after('broker_invite_id')
                ->constrained('tenant_broker_invite_links')
                ->nullOnDelete();
        });

        DB::table('broker_tenants')->update([
            'approved_at' => DB::raw('accepted_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('broker_tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tenant_broker_invite_link_id');
            $table->dropColumn('approved_at');
        });
    }
};
