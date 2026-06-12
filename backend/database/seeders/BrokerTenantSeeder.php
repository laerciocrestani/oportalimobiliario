<?php

namespace Database\Seeders;

use App\Models\BrokerInvite;
use App\Models\BrokerTenant;
use Illuminate\Database\Seeder;

class BrokerTenantSeeder extends Seeder
{
    public function run(): void
    {
        $acceptedInvites = BrokerInvite::query()
            ->whereNotNull('accepted_at')
            ->whereNotNull('broker_id')
            ->get();

        foreach ($acceptedInvites as $invite) {
            BrokerTenant::query()->firstOrCreate(
                [
                    'tenant_id' => $invite->tenant_id,
                    'broker_id' => $invite->broker_id,
                ],
                [
                    'broker_invite_id' => $invite->id,
                    'accepted_at' => $invite->accepted_at,
                ],
            );
        }
    }
}
