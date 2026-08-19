<?php

namespace Database\Factories;

use App\Enums\FloorKind;
use App\Models\Floor;
use App\Models\Tower;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Floor>
 */
class FloorFactory extends Factory
{
    protected $model = Floor::class;

    public function definition(): array
    {
        return [
            'tower_id' => Tower::factory(),
            'number' => fake()->numberBetween(1, 40),
            'kind' => FloorKind::Residential,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Floor $floor): void {
            if ($floor->tower_id === null) {
                return;
            }

            $tower = Tower::query()->find($floor->tower_id);

            if ($tower !== null) {
                $floor->tenant_id = $tower->tenant_id;
            }
        });
    }

    public function commercial(): static
    {
        return $this->state(fn () => [
            'kind' => FloorKind::Commercial,
        ]);
    }
}
