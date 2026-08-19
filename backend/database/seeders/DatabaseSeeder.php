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
            InccIndexSeeder::class,
            AmenitySeeder::class,
            BuildingSeeder::class,
            WizardBuildingSeeder::class,
            TowerSeeder::class,
            UnitSeeder::class,
            BuildingMediaSeeder::class,
            BrokerInviteSeeder::class,
            BrokerTenantSeeder::class,
            UnitAccessSeeder::class,
            BuildingAccessSeeder::class,
            ReservationSeeder::class,
            ContractTemplateSeeder::class,
        ]);
    }
}
