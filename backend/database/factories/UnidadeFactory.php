<?php

namespace Database\Factories;

use App\Enums\UnidadeStatus;
use App\Models\Empreendimento;
use App\Models\Tenant;
use App\Models\Unidade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unidade>
 */
class UnidadeFactory extends Factory
{
    protected $model = Unidade::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'empreendimento_id' => Empreendimento::factory(),
            'codigo' => strtoupper(fake()->bothify('??-###')),
            'andar' => fake()->numberBetween(1, 20),
            'area_m2' => fake()->randomFloat(2, 40, 200),
            'preco' => fake()->randomFloat(2, 200000, 1500000),
            'status' => UnidadeStatus::Disponivel,
        ];
    }

    public function reservada(): static
    {
        return $this->state(fn () => ['status' => UnidadeStatus::Reservada]);
    }

    public function vendida(): static
    {
        return $this->state(fn () => ['status' => UnidadeStatus::Vendida]);
    }
}
