<?php

namespace Database\Factories;

use App\Enums\DepositKind;
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
            'party_kind' => 'individual',
            'client_cpf' => fake()->numerify('###########'),
            'client_rg' => null,
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'state' => 'SP',
            'zip' => '01000-000',
            'marital_status' => 'solteiro',
            'nationality' => 'brasileira',
            'profession' => 'engenheira',
            'spouse_name' => null,
            'spouse_phone' => null,
            'spouse_email' => null,
            'spouse_cpf' => null,
            'spouse_rg' => null,
            'spouse_nationality' => null,
            'land_value' => fake()->randomFloat(2, 50000, 500000),
            'payment_terms' => 'Pix R$ 10.000 + 24x R$ 5.000',
            'commercial_terms' => null,
            'deposit_kind' => DepositKind::Pix,
            'submitted_by' => User::factory()->broker(),
        ];
    }
}
