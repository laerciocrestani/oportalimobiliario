<?php

namespace Database\Factories;

use App\Models\BrokerAccessRequest;
use App\Models\Building;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrokerAccessRequest>
 */
class BrokerAccessRequestFactory extends Factory
{
    protected $model = BrokerAccessRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'building_id' => function (array $attributes) {
                return Building::factory()->create([
                    'tenant_id' => $attributes['tenant_id'],
                ])->id;
            },
            'name' => fake()->name(),
            'phone' => '+5511999990000',
            'email' => fake()->safeEmail(),
        ];
    }
}
