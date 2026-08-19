<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\Tenant;
use App\Models\Tower;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tower>
 */
class TowerFactory extends Factory
{
    protected $model = Tower::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'building_id' => Building::factory(),
            'name' => fake()->randomElement(['Torre A', 'Torre B', 'Torre Comercial', 'Torre única']),
            'sort_order' => 0,
            'floors_count' => 0,
        ];
    }
}
