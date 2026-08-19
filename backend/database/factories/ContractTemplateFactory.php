<?php

namespace Database\Factories;

use App\Models\ContractTemplate;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContractTemplate>
 */
class ContractTemplateFactory extends Factory
{
    protected $model = ContractTemplate::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->unique()->words(3, true),
            'body_markdown' => "# Contrato\n\nComprador: {{nome_cliente}}\nCPF: {{cpf_cliente}}\nUnidade: {{codigo_unidade}}\nValor: {{preco_final}}\n",
            'custom_variables' => [],
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
