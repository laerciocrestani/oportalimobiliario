<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnitAccess>
 */
class UnitAccessFactory extends Factory
{
    protected $model = UnitAccess::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'broker_id' => User::factory()->broker(),
            'unit_id' => Unit::factory(),
        ];
    }
}
