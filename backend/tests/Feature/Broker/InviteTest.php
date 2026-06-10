<?php

/**
 * @see REQ-CONV-001
 * @see REQ-CONV-002
 * @see REQ-CONV-004
 */
use App\Models\BrokerInvite;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('creates invite as builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', ['email' => 'novo@broker.com'])
        ->assertCreated()
        ->assertJsonPath('email', 'novo@broker.com');
});

it('accepts invite as broker', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['email' => 'aceite@demo.com']);

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'aceite@demo.com',
    ]);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/invites/accept', ['token' => $invite->token])
        ->assertOk()
        ->assertJsonPath('broker_id', $broker->id);
});

it('lists units by access for broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['code' => '777']);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Unit::factory()->for($tenant)->create(['code' => '888']);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.code', '777');
});

it('grants access from builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->postJson('/api/builder/access', [
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ])->assertCreated();
});
