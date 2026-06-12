<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $pairs = DB::table('unit_access')
            ->join('units', 'units.id', '=', 'unit_access.unit_id')
            ->select('unit_access.tenant_id', 'unit_access.broker_id', 'units.building_id')
            ->distinct()
            ->get();

        foreach ($pairs as $pair) {
            DB::table('building_access')->insertOrIgnore([
                'tenant_id' => $pair->tenant_id,
                'broker_id' => $pair->broker_id,
                'building_id' => $pair->building_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $acceptedInvites = DB::table('broker_invites')
            ->whereNotNull('accepted_at')
            ->whereNotNull('broker_id')
            ->get();

        foreach ($acceptedInvites as $invite) {
            DB::table('broker_tenants')->insertOrIgnore([
                'tenant_id' => $invite->tenant_id,
                'broker_id' => $invite->broker_id,
                'broker_invite_id' => $invite->id,
                'accepted_at' => $invite->accepted_at,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('building_access')->truncate();
        DB::table('broker_tenants')->truncate();
    }
};
