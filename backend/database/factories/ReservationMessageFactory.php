<?php

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReservationMessage>
 */
class ReservationMessageFactory extends Factory
{
    protected $model = ReservationMessage::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'user_id' => User::factory()->broker(),
            'body' => fake()->sentence(),
        ];
    }
}
