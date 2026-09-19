<?php

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\ReservationMessageRead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReservationMessageRead>
 */
class ReservationMessageReadFactory extends Factory
{
    protected $model = ReservationMessageRead::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'user_id' => User::factory()->broker(),
            'last_read_message_id' => null,
        ];
    }
}
