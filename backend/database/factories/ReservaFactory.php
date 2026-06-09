<?php

namespace Database\Factories;

use App\Models\Reserva;
use App\Models\Tenant;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reserva>
 */
class ReservaFactory extends Factory
{
    protected $model = Reserva::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'unidade_id' => Unidade::factory()->reservada(),
            'corretor_id' => User::factory()->corretor(),
            'expires_at' => now()->addHours(48),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => ['expires_at' => now()->subHour()]);
    }
}
