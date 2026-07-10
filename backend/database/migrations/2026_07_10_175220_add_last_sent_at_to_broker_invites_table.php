<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broker_invites', function (Blueprint $table) {
            $table->timestamp('last_sent_at')->nullable()->after('expires_at');
        });

        DB::table('broker_invites')
            ->whereNull('last_sent_at')
            ->update(['last_sent_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('broker_invites', function (Blueprint $table) {
            $table->dropColumn('last_sent_at');
        });
    }
};
