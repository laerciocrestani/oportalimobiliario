<?php

namespace Database\Factories;

use App\Enums\BuildingMediaCategory;
use App\Models\Building;
use App\Models\BuildingMedia;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BuildingMedia>
 */
class BuildingMediaFactory extends Factory
{
    protected $model = BuildingMedia::class;

    public function definition(): array
    {
        return [
            'building_id' => Building::factory(),
            'category' => BuildingMediaCategory::Internal,
            'path' => 'buildings/1/1/'.fake()->uuid().'.jpg',
            'original_name' => fake()->word().'.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => fake()->numberBetween(10_000, 500_000),
            'published' => false,
            'sort_order' => 0,
        ];
    }

    public function external(): static
    {
        return $this->state(fn () => ['category' => BuildingMediaCategory::External]);
    }

    public function internal(): static
    {
        return $this->state(fn () => ['category' => BuildingMediaCategory::Internal]);
    }

    public function floorPlan(): static
    {
        return $this->state(fn () => [
            'category' => BuildingMediaCategory::FloorPlan,
            'published' => false,
        ]);
    }

    public function published(): static
    {
        return $this->state(fn () => ['published' => true]);
    }
}
