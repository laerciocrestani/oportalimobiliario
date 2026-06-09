<?php

namespace Database\Factories;

use App\Models\ConviteCorretor;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ConviteCorretor>
 */
class ConviteCorretorFactory extends Factory
{
    protected $model = ConviteCorretor::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'created_by' => User::factory()->construtora(),
            'email' => fake()->unique()->safeEmail(),
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ];
    }

    public function accepted(User $corretor): static
    {
        return $this->state(fn () => [
            'corretor_id' => $corretor->id,
            'accepted_at' => now(),
            'email' => $corretor->email,
        ]);
    }
}
