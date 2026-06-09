<?php

namespace Database\Factories;

use App\Models\AcessoUnidade;
use App\Models\Tenant;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcessoUnidade>
 */
class AcessoUnidadeFactory extends Factory
{
    protected $model = AcessoUnidade::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'corretor_id' => User::factory()->corretor(),
            'unidade_id' => Unidade::factory(),
        ];
    }
}
