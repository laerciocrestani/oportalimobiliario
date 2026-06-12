<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BuildingAccess>
 */
class BuildingAccessFactory extends Factory
{
    protected $model = BuildingAccess::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'broker_id' => User::factory()->broker(),
            'building_id' => Building::factory(),
        ];
    }
}
