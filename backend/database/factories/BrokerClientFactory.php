<?php

namespace Database\Factories;

use App\Models\BrokerClient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrokerClient>
 */
class BrokerClientFactory extends Factory
{
    protected $model = BrokerClient::class;

    public function definition(): array
    {
        return [
            'broker_id' => User::factory()->broker(),
            'name' => fake()->name(),
            'phone' => fake()->numerify('(##) #####-####'),
            'email' => fake()->optional()->safeEmail(),
        ];
    }
}
