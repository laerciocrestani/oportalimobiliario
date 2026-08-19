<?php

namespace Database\Factories;

use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'building_id' => Building::factory(),
            'code' => strtoupper(fake()->bothify('??-###')),
            'floor' => fake()->numberBetween(1, 20),
            'area_m2' => $area = fake()->randomFloat(2, 40, 200),
            'private_area_m2' => $area,
            'price' => $price = fake()->randomFloat(2, 200000, 1500000),
            'price_base' => $price,
            'status' => UnitStatus::Available,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Unit $unit): void {
            if ($unit->tower_id !== null) {
                return;
            }

            if ($unit->building_id === null) {
                return;
            }

            $tower = Tower::query()->firstOrCreate(
                ['building_id' => $unit->building_id, 'name' => 'Torre única'],
                [
                    'tenant_id' => $unit->tenant_id,
                    'sort_order' => 0,
                ],
            );

            $unit->tower_id = $tower->id;
        });
    }

    public function reserved(): static
    {
        return $this->state(fn () => ['status' => UnitStatus::Reserved]);
    }

    public function sold(): static
    {
        return $this->state(fn () => ['status' => UnitStatus::Sold]);
    }

    public function preReserved(): static
    {
        return $this->state(fn () => ['status' => UnitStatus::PreReserved]);
    }

    public function unavailable(): static
    {
        return $this->state(fn () => ['status' => UnitStatus::Unavailable]);
    }
}
