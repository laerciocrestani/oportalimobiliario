<?php

/**
 * @see REQ-CONV-001
 * @see REQ-CONV-002
 * @see REQ-CONV-004
 * @see REQ-CONV-006
 * @see REQ-CONV-008
 * @see REQ-CONV-009
 */
use App\Mail\BrokerInviteMail;
use App\Models\BrokerInvite;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

it('creates invite as builder and sends email', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', ['email' => 'novo@broker.com'])
        ->assertCreated()
        ->assertJsonPath('email', 'novo@broker.com')
        ->assertJsonPath('status', 'pending')
        ->assertJsonStructure(['invite_url']);

    Mail::assertSent(BrokerInviteMail::class);
});

it('lists invites with status', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'email' => 'pendente@demo.com',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/invites')
        ->assertOk()
        ->assertJsonFragment(['email' => 'pendente@demo.com', 'status' => 'pending']);
});

it('previews invite without authentication', function () {
    $tenant = Tenant::factory()->create(['name' => 'Alpha Corp']);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'preview@demo.com',
    ]);

    $this->getJson('/api/broker/invites/preview?token='.$invite->token)
        ->assertOk()
        ->assertJsonPath('email', 'preview@demo.com')
        ->assertJsonPath('tenant_name', 'Alpha Corp')
        ->assertJsonPath('status', 'pending');
});

it('accepts invite and creates broker account', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'novo.corretor@demo.com',
    ]);

    $this->postJson('/api/broker/invites/accept', [
        'token' => $invite->token,
        'name' => 'Novo Corretor',
        'password' => 'password123',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'user']);

    $broker = User::query()->where('email', 'novo.corretor@demo.com')->first();

    expect($broker)->not->toBeNull()
        ->and($broker->role)->toBe('broker');

    expect(BrokerTenant::query()->where('tenant_id', $tenant->id)->where('broker_id', $broker->id)->exists())->toBeTrue();
});

it('accepts invite for existing broker', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['email' => 'aceite@demo.com']);

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'aceite@demo.com',
    ]);

    $this->postJson('/api/broker/invites/accept', ['token' => $invite->token])
        ->assertOk()
        ->assertJsonPath('user.id', $broker->id);
});

it('resends pending invite', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);
    $oldToken = $invite->token;

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/invites/{$invite->id}/resend")
        ->assertOk()
        ->assertJsonPath('status', 'pending');

    expect($invite->fresh()->token)->not->toBe($oldToken);
    Mail::assertSent(BrokerInviteMail::class);
});

it('cancels pending invite', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/invites/{$invite->id}")
        ->assertNoContent();

    expect(BrokerInvite::query()->find($invite->id))->toBeNull();
});

it('lists units by building access for broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['code' => '777']);
    Unit::factory()->for($tenant)->for($building)->create(['code' => '888']);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonCount(2);
});

it('lists units by legacy unit access for broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['code' => '777']);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.code', '777');
});

it('grants building access from builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/brokers/{$broker->id}/buildings", [
        'building_id' => $building->id,
    ])->assertCreated();
});

it('lists linked brokers for builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/brokers')
        ->assertOk()
        ->assertJsonFragment(['email' => $broker->email]);
});
