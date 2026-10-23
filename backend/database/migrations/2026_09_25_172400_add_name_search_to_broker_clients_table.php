<?php

use App\Models\BrokerClient;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broker_clients', function (Blueprint $table) {
            $table->string('name_search')->default('');
        });

        foreach (DB::table('broker_clients')->select(['id', 'name'])->orderBy('id')->get() as $client) {
            DB::table('broker_clients')
                ->where('id', $client->id)
                ->update(['name_search' => BrokerClient::foldName($client->name)]);
        }
    }

    public function down(): void
    {
        Schema::table('broker_clients', function (Blueprint $table) {
            $table->dropColumn('name_search');
        });
    }
};
