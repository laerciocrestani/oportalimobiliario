<?php

namespace Database\Factories;

use App\Enums\BrokerInviteChannel;
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
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => null,
            'channel' => BrokerInviteChannel::Email,
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ];
    }

    public function whatsapp(?string $phone = null): static
    {
        return $this->state(fn () => [
            'channel' => BrokerInviteChannel::WhatsApp,
            'phone' => $phone ?? '+5511999999999',
            'email' => null,
        ]);
    }

    public function linkOnly(): static
    {
        return $this->state(fn () => [
            'channel' => BrokerInviteChannel::Link,
            'email' => null,
            'phone' => null,
        ]);
    }

    public function accepted(User $broker): static
    {
        return $this->state(fn () => [
            'broker_id' => $broker->id,
            'accepted_at' => now(),
            'email' => $broker->email,
            'name' => $broker->name,
        ]);
    }
}
