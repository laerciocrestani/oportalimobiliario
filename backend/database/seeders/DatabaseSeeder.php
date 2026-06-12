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
            BuildingSeeder::class,
            TowerSeeder::class,
            UnitSeeder::class,
            BrokerInviteSeeder::class,
            BrokerTenantSeeder::class,
            UnitAccessSeeder::class,
            BuildingAccessSeeder::class,
            ReservationSeeder::class,
        ]);
    }
}
