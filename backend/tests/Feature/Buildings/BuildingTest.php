<?php

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-005
 * @see REQ-WIZ-008
 * @see REQ-WIZ-009
 * @see REQ-WIZ-011
 * @see REQ-WIZ-015
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

it('creates building with address as unpublished wizard draft', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/buildings', [
        'name' => 'Residencial Aurora',
        'zip' => '01310-100',
        'street' => 'Avenida Paulista',
        'number' => '1000',
        'complement' => 'Conjunto 12',
        'neighborhood' => 'Bela Vista',
        'city' => 'São Paulo',
        'state' => 'sp',
        'wizard_step' => 1,
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Residencial Aurora')
        ->assertJsonPath('zip', '01310100')
        ->assertJsonPath('street', 'Avenida Paulista')
        ->assertJsonPath('number', '1000')
        ->assertJsonPath('neighborhood', 'Bela Vista')
        ->assertJsonPath('city', 'São Paulo')
        ->assertJsonPath('state', 'SP')
        ->assertJsonPath('published', false)
        ->assertJsonPath('wizard_step', 1)
        ->assertJsonPath('wizard_completed_at', null);
});

it('updates building address', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['name' => 'Rascunho']);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'zip' => '01310100',
        'street' => 'Rua Augusta',
        'number' => '200',
        'neighborhood' => 'Consolação',
        'city' => 'São Paulo',
        'state' => 'SP',
        'wizard_step' => 1,
    ])
        ->assertOk()
        ->assertJsonPath('street', 'Rua Augusta')
        ->assertJsonPath('zip', '01310100')
        ->assertJsonPath('wizard_step', 1);
});

it('rejects invalid zip on create', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/buildings', [
        'name' => 'Sem CEP válido',
        'zip' => '123',
    ])->assertUnprocessable()->assertJsonValidationErrors(['zip']);
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

it('publishes a draft when available units have price', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 4,
        'wizard_completed_at' => null,
    ]);
    Unit::factory()->for($tenant)->for($building)->create([
        'status' => UnitStatus::Available,
        'price' => 520000,
    ]);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'description' => 'Residencial com duas torres.',
        'published' => true,
        'wizard_step' => 4,
    ])
        ->assertOk()
        ->assertJsonPath('published', true)
        ->assertJsonPath('description', 'Residencial com duas torres.')
        ->assertJsonPath('wizard_step', 4);

    expect($building->fresh()->wizard_completed_at)->not->toBeNull();
});

it('rejects publishing when an available unit has no price', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);
    Unit::factory()->for($tenant)->for($building)->create([
        'status' => UnitStatus::Available,
        'price' => null,
    ]);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'published' => true,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['published']);

    expect($building->fresh()->published)->toBeFalse()
        ->and($building->fresh()->wizard_completed_at)->toBeNull();
});

it('keeps a wizard draft unpublished after media step', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 3,
    ]);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'description' => 'Texto do rascunho.',
        'published' => false,
        'wizard_step' => 4,
    ])
        ->assertOk()
        ->assertJsonPath('published', false)
        ->assertJsonPath('wizard_step', 4)
        ->assertJsonPath('wizard_completed_at', null);
});

it('stores building finishing defaults on update', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'ceiling_type' => 'plaster',
        'opening_type' => 'aluminum',
        'flooring_type' => 'porcelain',
        'solar_position' => 'north',
        'sun_period' => 'morning',
    ])
        ->assertOk()
        ->assertJsonPath('ceiling_type', 'plaster')
        ->assertJsonPath('opening_type', 'aluminum')
        ->assertJsonPath('flooring_type', 'porcelain')
        ->assertJsonPath('solar_position', 'north')
        ->assertJsonPath('sun_period', 'morning');
});

it('rejects unknown building finishing defaults', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'ceiling_type' => 'marble',
    ])->assertUnprocessable();
});

it('stores unit spec sheet and mirrors price into price_base', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    Sanctum::actingAs($user);

    $response = $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $tower->id,
        'code' => '704',
        'floor' => 7,
        'price' => 610000,
        'bedrooms' => 2,
        'bathrooms' => 2,
        'suites' => 1,
        'powder_rooms' => 0,
        'balconies' => 1,
        'private_area_m2' => 78.5,
        'total_area_m2' => 92,
        'property_position' => 'front',
        'solar_position' => 'east',
        'sun_period' => 'afternoon',
        'ceiling_type' => 'plaster',
        'price_competence' => '2026-07-01',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('code', '704')
        ->assertJsonPath('price', null)
        ->assertJsonPath('price_base', '610000.00')
        ->assertJsonPath('price_incc_current', null)
        ->assertJsonPath('private_area_m2', '78.50')
        ->assertJsonPath('bedrooms', 2)
        ->assertJsonPath('property_position', 'front');

    expect($response->json('floor_id'))->not->toBeNull();
});
