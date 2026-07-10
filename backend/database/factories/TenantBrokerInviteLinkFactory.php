<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\TenantBrokerInviteLink;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TenantBrokerInviteLink>
 */
class TenantBrokerInviteLinkFactory extends Factory
{
    protected $model = TenantBrokerInviteLink::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'created_by' => User::factory()->builder(),
            'token' => Str::random(48),
            'regenerated_at' => null,
        ];
    }
}
