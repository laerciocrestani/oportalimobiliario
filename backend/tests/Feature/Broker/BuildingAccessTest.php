<?php

/**
 * @see REQ-CONV-007
 */
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('revokes building access from builder', function () {
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

    $this->deleteJson("/api/builder/brokers/{$broker->id}/buildings/{$building->id}")
        ->assertNoContent();

    expect(BuildingAccess::query()->count())->toBe(0);
});

it('lists broker buildings for builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create(['name' => 'Torre A']);

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

    $this->getJson("/api/builder/brokers/{$broker->id}/buildings")
        ->assertOk()
        ->assertJsonFragment(['name' => 'Torre A']);
});

it('denies building access without broker tenant link', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/brokers/{$broker->id}/buildings", [
        'building_id' => $building->id,
    ])->assertNotFound();
});
