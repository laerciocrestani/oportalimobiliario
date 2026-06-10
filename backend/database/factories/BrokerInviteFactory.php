<?php

namespace Database\Factories;

use App\Models\BrokerInvite;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BrokerInvite>
 */
class BrokerInviteFactory extends Factory
{
    protected $model = BrokerInvite::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'created_by' => User::factory()->builder(),
            'email' => fake()->unique()->safeEmail(),
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ];
    }

    public function accepted(User $broker): static
    {
        return $this->state(fn () => [
            'broker_id' => $broker->id,
            'accepted_at' => now(),
            'email' => $broker->email,
        ]);
    }
}
