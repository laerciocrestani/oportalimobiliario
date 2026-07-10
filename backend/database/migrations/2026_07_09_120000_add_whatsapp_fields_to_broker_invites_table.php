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
            $table->string('name')->default('Convidado')->after('created_by');
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('channel', 20)->default('email')->after('phone');
            $table->string('whatsapp_message_id')->nullable()->after('channel');
            $table->string('delivery_status', 20)->nullable()->after('whatsapp_message_id');
            $table->text('delivery_error')->nullable()->after('delivery_status');
        });

        DB::table('broker_invites')
            ->select(['id', 'email'])
            ->orderBy('id')
            ->lazy()
            ->each(function ($invite): void {
                $localPart = is_string($invite->email) ? strstr($invite->email, '@', true) : false;

                DB::table('broker_invites')
                    ->where('id', $invite->id)
                    ->update([
                        'name' => $localPart !== false && $localPart !== '' ? $localPart : 'Convidado',
                        'channel' => 'email',
                    ]);
            });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE broker_invites ALTER COLUMN email DROP NOT NULL');
        } else {
            Schema::table('broker_invites', function (Blueprint $table) {
                $table->string('email')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        DB::table('broker_invites')->whereNull('email')->delete();

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE broker_invites ALTER COLUMN email SET NOT NULL');
        }

        Schema::table('broker_invites', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'phone',
                'channel',
                'whatsapp_message_id',
                'delivery_status',
                'delivery_error',
            ]);
        });
    }
};
