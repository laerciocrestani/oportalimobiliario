<?php

namespace Database\Seeders;

use App\Models\BrokerInvite;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BrokerInviteSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();
        $beta = Tenant::query()->where('slug', 'construtora-beta')->first();
        $alphaBuilder = User::query()->where('email', 'construtora@alpha.demo')->first();
        $betaBuilder = User::query()->where('email', 'construtora@beta.demo')->first();
        $broker = User::query()->where('email', 'corretor@demo.com')->first();

        if ($alpha === null || $alphaBuilder === null || $broker === null) {
            return;
        }

        BrokerInvite::query()->firstOrCreate(
            ['tenant_id' => $alpha->id, 'email' => $broker->email],
            [
                'created_by' => $alphaBuilder->id,
                'name' => $broker->name,
                'channel' => 'email',
                'token' => 'demo-invite-accepted-'.Str::lower(Str::random(8)),
                'broker_id' => $broker->id,
                'accepted_at' => now(),
                'expires_at' => now()->addDays(7),
            ],
        );

        BrokerInvite::query()->firstOrCreate(
            ['tenant_id' => $alpha->id, 'email' => 'novo.corretor@demo.com'],
            [
                'created_by' => $alphaBuilder->id,
                'name' => 'Novo Corretor',
                'channel' => 'email',
                'token' => 'demo-invite-pending-'.Str::lower(Str::random(8)),
                'broker_id' => null,
                'accepted_at' => null,
                'expires_at' => now()->addDays(14),
            ],
        );

        if ($beta !== null && $betaBuilder !== null) {
            BrokerInvite::query()->firstOrCreate(
                ['tenant_id' => $beta->id, 'email' => $broker->email],
                [
                    'created_by' => $betaBuilder->id,
                    'name' => $broker->name,
                    'channel' => 'email',
                    'token' => 'demo-invite-beta-'.Str::lower(Str::random(8)),
                    'broker_id' => $broker->id,
                    'accepted_at' => now(),
                    'expires_at' => now()->addDays(7),
                ],
            );
        }
    }
}
