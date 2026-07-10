<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\Tenant;
use App\Support\BuildingSlug;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    protected $model = Building::class;

    public function definition(): array
    {
        $name = fake()->words(3, true);

        return [
            'tenant_id' => Tenant::factory(),
            'name' => $name,
            'slug' => BuildingSlug::generateUnique($name),
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
