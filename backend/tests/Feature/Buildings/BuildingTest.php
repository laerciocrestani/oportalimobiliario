<?php

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-005
 */
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\BuildingMedia;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists buildings scoped to tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    Building::factory()->for($alpha)->create(['name' => 'Alpha Building']);
    Building::factory()->for($beta)->create(['name' => 'Beta Building']);

    Sanctum::actingAs($alphaUser);

    $this->getJson('/api/builder/buildings')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Alpha Building');
});

it('includes units summary when listing buildings', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Unit::factory()->for($tenant)->for($building)->count(2)->create([
        'status' => UnitStatus::Available,
    ]);
    Unit::factory()->for($tenant)->for($building)->sold()->create();
    Unit::factory()->for($tenant)->for($building)->preReserved()->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/buildings')
        ->assertOk()
        ->assertJsonPath('0.units_summary.total', 4)
        ->assertJsonPath('0.units_summary.available', 2)
        ->assertJsonPath('0.units_summary.pre_reserved', 1)
        ->assertJsonPath('0.units_summary.sold', 1)
        ->assertJsonPath('0.units_summary.reserved', 0)
        ->assertJsonPath('0.units_summary.unavailable', 0);
});

it('includes cover image when listing buildings', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['name' => 'With Cover']);

    $cover = BuildingMedia::factory()->for($building)->internal()->create([
        'sort_order' => 0,
        'mime_type' => 'image/jpeg',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/buildings')
        ->assertOk()
        ->assertJsonPath('0.cover_image.id', $cover->id)
        ->assertJsonPath('0.cover_image.url', "/builder/buildings/{$building->id}/media/{$cover->id}/file");
});

it('creates building for builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/buildings', [
        'name' => 'New Building',
        'published' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'New Building')
        ->assertJsonPath('published', true)
        ->assertJsonPath('units_summary.total', 0);

    expect(Building::query()->count())->toBe(1);
});

it('shows building with towers units and summary', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $towerA = Tower::factory()->for($tenant)->for($building)->create(['name' => 'Torre A', 'sort_order' => 0]);
    $towerB = Tower::factory()->for($tenant)->for($building)->create(['name' => 'Torre B', 'sort_order' => 1]);

    Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $towerA->id,
        'code' => '101',
        'status' => UnitStatus::Available,
    ]);
    Unit::factory()->for($tenant)->for($building)->reserved()->create([
        'tower_id' => $towerB->id,
        'code' => '201',
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}")
        ->assertOk()
        ->assertJsonPath('units_summary.total', 2)
        ->assertJsonPath('units_summary.available', 1)
        ->assertJsonPath('units_summary.reserved', 1)
        ->assertJsonCount(2, 'towers')
        ->assertJsonPath('towers.0.name', 'Torre A')
        ->assertJsonPath('towers.0.units_summary.available', 1)
        ->assertJsonPath('towers.1.units_summary.reserved', 1)
        ->assertJsonCount(2, 'units');
});

it('manages units nested under building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $tower->id,
        'code' => '501',
        'price' => 500000,
    ])
        ->assertCreated()
        ->assertJsonPath('code', '501')
        ->assertJsonPath('status', 'available')
        ->assertJsonPath('tower_id', $tower->id);

    $this->getJson("/api/builder/buildings/{$building->id}/units")
        ->assertOk()
        ->assertJsonCount(1);
});

it('denies building routes to non builder', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/builder/buildings')->assertForbidden();
});

it('isolates buildings between tenants on show', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $building = Building::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->getJson("/api/builder/buildings/{$building->id}")
        ->assertNotFound();
});
