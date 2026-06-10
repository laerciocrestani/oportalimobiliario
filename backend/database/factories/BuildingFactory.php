<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    protected $model = Building::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->paragraph(),
            'city' => fake()->city(),
            'state' => fake()->stateAbbr(),
            'published' => false,
            'seo_title' => fake()->sentence(4),
            'seo_description' => fake()->sentence(10),
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => ['published' => true]);
    }
}
