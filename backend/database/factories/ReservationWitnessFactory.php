<?php

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\ReservationWitness;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReservationWitness>
 */
class ReservationWitnessFactory extends Factory
{
    protected $model = ReservationWitness::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'user_id' => User::factory()->builder(),
            'slot' => 1,
            'signed_at' => null,
        ];
    }

    public function slot(int $slot): static
    {
        return $this->state(fn () => ['slot' => $slot]);
    }

    public function signed(): static
    {
        return $this->state(fn () => ['signed_at' => now()]);
    }
}
