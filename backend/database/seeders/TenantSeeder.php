<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        Tenant::query()->firstOrCreate(
            ['slug' => 'construtora-alpha'],
            ['name' => 'Construtora Alpha', 'active' => true],
        );

        Tenant::query()->firstOrCreate(
            ['slug' => 'construtora-beta'],
            ['name' => 'Construtora Beta', 'active' => true],
        );
    }
}
