<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Database\Seeder;

class BuildingAccessSeeder extends Seeder
{
    public function run(): void
    {
        $pairs = UnitAccess::query()
            ->join('units', 'units.id', '=', 'unit_access.unit_id')
            ->select('unit_access.tenant_id', 'unit_access.broker_id', 'units.building_id')
            ->distinct()
            ->get();

        foreach ($pairs as $pair) {
            BuildingAccess::query()->firstOrCreate(
                [
                    'broker_id' => $pair->broker_id,
                    'building_id' => $pair->building_id,
                ],
                ['tenant_id' => $pair->tenant_id],
            );
        }

        $broker = User::query()->where('email', 'corretor@demo.com')->first();

        if ($broker === null) {
            return;
        }

        $betaBuilding = Building::query()
            ->where('name', 'Residencial Beta Norte')
            ->first();

        if ($betaBuilding !== null) {
            BuildingAccess::query()->firstOrCreate(
                [
                    'broker_id' => $broker->id,
                    'building_id' => $betaBuilding->id,
                ],
                ['tenant_id' => $betaBuilding->tenant_id],
            );
        }
    }
}
