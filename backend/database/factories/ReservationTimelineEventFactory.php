<?php

namespace Database\Factories;

use App\Enums\ReservationTimelineEventType;
use App\Models\Reservation;
use App\Models\ReservationTimelineEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReservationTimelineEvent>
 */
class ReservationTimelineEventFactory extends Factory
{
    protected $model = ReservationTimelineEvent::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'type' => ReservationTimelineEventType::PreHoldCreated,
            'actor_id' => User::factory(),
            'payload' => null,
            'created_at' => now(),
        ];
    }
}
