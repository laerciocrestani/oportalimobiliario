<?php

namespace Database\Factories;

use App\Models\Empreendimento;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Empreendimento>
 */
class EmpreendimentoFactory extends Factory
{
    protected $model = Empreendimento::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'nome' => fake()->words(3, true),
            'descricao' => fake()->paragraph(),
            'cidade' => fake()->city(),
            'estado' => fake()->stateAbbr(),
            'publicado' => false,
            'seo_title' => fake()->sentence(4),
            'seo_description' => fake()->sentence(10),
        ];
    }

    public function publicado(): static
    {
        return $this->state(fn () => ['publicado' => true]);
    }
}
