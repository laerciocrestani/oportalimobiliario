<?php

namespace Database\Factories;

use App\Enums\UserActivityAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserActivityEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserActivityEvent>
 */
class UserActivityEventFactory extends Factory
{
    protected $model = UserActivityEvent::class;

    public function definition(): array
    {
        return [
            'actor_user_id' => User::factory(),
            'tenant_id' => Tenant::factory(),
            'action' => UserActivityAction::AuthLogin,
            'resource_type' => null,
            'resource_id' => null,
            'message' => 'Entrou no sistema.',
            'old_values' => null,
            'new_values' => null,
            'impersonator_user_id' => null,
            'impersonated_user_id' => null,
            'created_at' => now(),
        ];
    }
}
