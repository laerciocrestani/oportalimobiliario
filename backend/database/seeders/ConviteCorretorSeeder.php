<?php

namespace Database\Seeders;

use App\Models\ConviteCorretor;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ConviteCorretorSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();
        $construtora = User::query()->where('email', 'construtora@alpha.demo')->first();
        $corretor = User::query()->where('email', 'corretor@demo.com')->first();

        if ($alpha === null || $construtora === null || $corretor === null) {
            return;
        }

        ConviteCorretor::query()->firstOrCreate(
            ['tenant_id' => $alpha->id, 'email' => $corretor->email],
            [
                'created_by' => $construtora->id,
                'token' => 'demo-convite-token-'.Str::lower(Str::random(8)),
                'corretor_id' => $corretor->id,
                'accepted_at' => now(),
                'expires_at' => now()->addDays(7),
            ],
        );
    }
}
