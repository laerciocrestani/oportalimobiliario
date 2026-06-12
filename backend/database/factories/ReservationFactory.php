<?php

namespace Database\Factories;

use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    public function definition(): array
    {
        $broker = User::factory()->broker();

        return [
            'tenant_id' => Tenant::factory(),
            'unit_id' => Unit::factory()->reserved(),
            'broker_id' => $broker,
            'client_id' => BrokerClient::factory()->for($broker, 'broker'),
            'expires_at' => now()->addHours(48),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => ['expires_at' => now()->subHour()]);
    }
}
