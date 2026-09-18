<?php

namespace Database\Factories;

use App\Models\ProposalTemplate;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProposalTemplate>
 */
class ProposalTemplateFactory extends Factory
{
    protected $model = ProposalTemplate::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->unique()->words(3, true),
            'body_markdown' => "# Proposta comercial\n\nComprador: {{nome_cliente}}\nUnidade: {{codigo_unidade}}\nCondições: {{condicoes_pagamento}}\n",
            'custom_variables' => [],
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
