<?php

namespace Database\Factories;

use App\Models\BrokerTenant;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrokerTenant>
 */
class BrokerTenantFactory extends Factory
{
    protected $model = BrokerTenant::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'broker_id' => User::factory()->broker(),
            'broker_invite_id' => null,
            'accepted_at' => now(),
        ];
    }
}
