<?php

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReservationProposal>
 */
class ReservationProposalFactory extends Factory
{
    protected $model = ReservationProposal::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory()->preHold(),
            'version' => 1,
            'client_name' => fake()->name(),
            'client_email' => fake()->safeEmail(),
            'client_phone' => fake()->numerify('11#########'),
            'client_cpf' => fake()->numerify('###########'),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'state' => 'SP',
            'zip' => '01000-000',
            'marital_status' => 'solteiro',
            'nationality' => 'brasileira',
            'land_value' => fake()->randomFloat(2, 50000, 500000),
            'payment_terms' => 'Pix R$ 10.000 + 24x R$ 5.000',
            'submitted_by' => User::factory()->broker(),
        ];
    }
}
