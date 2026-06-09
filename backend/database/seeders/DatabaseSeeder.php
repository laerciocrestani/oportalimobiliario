<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            TenantSeeder::class,
            RolePermissionSeeder::class,
            UserSeeder::class,
            EmpreendimentoSeeder::class,
            UnidadeSeeder::class,
            ConviteCorretorSeeder::class,
            AcessoUnidadeSeeder::class,
            ReservaSeeder::class,
        ]);
    }
}
