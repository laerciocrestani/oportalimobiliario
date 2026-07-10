<?php

use App\Models\BrokerInvite;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('revokes pending invite instead of deleting', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/invites/{$invite->id}/revoke")
        ->assertOk()
        ->assertJsonPath('status', 'revoked');

    expect($invite->fresh()->revoked_at)->not->toBeNull();
});

it('reactivates revoked invite', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'revoked_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/invites/{$invite->id}/reactivate")
        ->assertOk()
        ->assertJsonPath('status', 'pending');

    expect($invite->fresh()->revoked_at)->toBeNull();
});

it('deactivates active broker and marks as inactive', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/brokers/{$broker->id}/deactivate")
        ->assertOk()
        ->assertJsonPath('status', 'inactive');

    $this->getJson('/api/builder/brokers')
        ->assertOk()
        ->assertJsonFragment(['name' => $broker->name, 'status' => 'inactive']);
});

it('reactivates inactive broker', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'revoked_at' => now(),
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/brokers/{$broker->id}/reactivate")
        ->assertOk()
        ->assertJsonPath('status', 'active');
});

it('removes broker link and building access', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($builder);

    $this->deleteJson("/api/builder/brokers/{$broker->id}")
        ->assertNoContent();

    expect(BrokerTenant::query()->count())->toBe(0)
        ->and(BuildingAccess::query()->count())->toBe(0);
});

it('blocks inactive broker from listing units', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    Unit::factory()->for($tenant)->for($building)->create(['code' => '101']);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'revoked_at' => now(),
    ]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertForbidden()
        ->assertJsonPath('access_status', 'restricted');
});

it('allows inactive broker to view profile with restricted status', function () {
    $tenant = Tenant::factory()->create(['name' => 'Construtora Inativa']);
    $broker = User::factory()->broker()->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'revoked_at' => now(),
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/profile')
        ->assertOk()
        ->assertJsonPath('access_status', 'restricted')
        ->assertJsonPath('inactive_tenants.0.tenant_name', 'Construtora Inativa');
});

it('restores unit access when broker is reactivated', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    Unit::factory()->for($tenant)->for($building)->create(['code' => '202']);

    $link = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'revoked_at' => now(),
    ]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($builder);
    $this->postJson("/api/builder/brokers/{$broker->id}/reactivate")->assertOk();

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonCount(1);
});

it('prevents accepting revoked invite token', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'revoked_at' => now(),
    ]);

    $this->postJson('/api/broker/invites/accept', [
        'token' => $invite->token,
        'password' => 'password123',
    ])->assertUnprocessable();
});
