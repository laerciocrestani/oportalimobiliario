<?php

namespace Database\Factories;

use App\Models\BrokerBuildingRequest;
use App\Models\Building;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrokerBuildingRequest>
 */
class BrokerBuildingRequestFactory extends Factory
{
    protected $model = BrokerBuildingRequest::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'broker_id' => User::factory()->broker(),
            'building_id' => Building::factory(),
        ];
    }
}
