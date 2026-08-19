<?php

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 * @see REQ-PUB-006
 * @see REQ-PUB-007
 * @see REQ-PUB-009
 */
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\BuildingMedia;
use App\Models\Tenant;
use App\Models\Unit;

it('lists only published buildings without auth', function () {
    $tenant = Tenant::factory()->create();
    Building::factory()->for($tenant)->published()->create(['name' => 'Published']);
    Building::factory()->for($tenant)->create(['name' => 'Draft', 'published' => false]);

    $this->getJson('/api/public/buildings')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Published')
        ->assertJsonPath('0.slug', fn ($slug) => is_string($slug) && $slug !== '');
});

it('returns cheapest available unit on public building list', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'With Units']);

    Unit::factory()->for($tenant)->for($building)->create([
        'code' => 'EXPENSIVE',
        'price' => 900000,
        'price_base' => 900000,
        'status' => UnitStatus::Available,
    ]);
    Unit::factory()->for($tenant)->for($building)->create([
        'code' => 'CHEAP',
        'price' => 350000,
        'price_base' => 350000,
        'area_m2' => 65.5,
        'floor' => 3,
        'status' => UnitStatus::Available,
    ]);
    Unit::factory()->for($tenant)->for($building)->sold()->create([
        'code' => 'SOLD',
        'price' => 200000,
    ]);

    $this->getJson('/api/public/buildings')
        ->assertOk()
        ->assertJsonPath('0.cheapest_unit.code', 'CHEAP')
        ->assertJsonPath('0.cheapest_unit.price', null)
        ->assertJsonPath('0.cheapest_unit.price_base', '350000.00')
        ->assertJsonPath('0.cheapest_unit.area_m2', '65.50')
        ->assertJsonPath('0.cheapest_unit.floor', 3);
});

it('returns null cheapest unit when no available priced units exist', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    Unit::factory()->for($tenant)->for($building)->sold()->create(['price' => 400000]);
    Unit::factory()->for($tenant)->for($building)->create([
        'price' => null,
        'status' => UnitStatus::Available,
    ]);

    $this->getJson('/api/public/buildings')
        ->assertOk()
        ->assertJsonPath('0.cheapest_unit', null);
});

it('returns first published public image as cover ordered by sort_order', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'With Media']);

    $internal = BuildingMedia::factory()->for($building)->internal()->published()->create([
        'sort_order' => 0,
        'mime_type' => 'image/jpeg',
        'original_name' => 'sala.jpg',
    ]);
    BuildingMedia::factory()->for($building)->external()->published()->create([
        'sort_order' => 1,
        'mime_type' => 'image/jpeg',
        'original_name' => 'fachada.jpg',
    ]);
    BuildingMedia::factory()->for($building)->external()->create([
        'published' => false,
        'mime_type' => 'image/jpeg',
    ]);
    BuildingMedia::factory()->for($building)->floorPlan()->create([
        'mime_type' => 'image/jpeg',
    ]);

    $response = $this->getJson('/api/public/buildings')
        ->assertOk();

    $cover = collect($response->json())->firstWhere('name', 'With Media')['cover_image'];

    expect($cover)->toMatchArray([
        'id' => $internal->id,
        'url' => "/public/buildings/{$building->slug}/media/{$internal->id}/file",
    ]);
});

it('returns distinct cover images per building', function () {
    $tenant = Tenant::factory()->create();
    $buildingA = Building::factory()->for($tenant)->published()->create(['name' => 'Alpha']);
    $buildingB = Building::factory()->for($tenant)->published()->create(['name' => 'Beta']);

    $mediaA = BuildingMedia::factory()->for($buildingA)->internal()->published()->create([
        'sort_order' => 0,
        'mime_type' => 'image/jpeg',
    ]);
    $mediaB = BuildingMedia::factory()->for($buildingB)->internal()->published()->create([
        'sort_order' => 0,
        'mime_type' => 'image/jpeg',
    ]);

    $response = $this->getJson('/api/public/buildings')->assertOk();

    $coverA = collect($response->json())->firstWhere('name', 'Alpha')['cover_image'];
    $coverB = collect($response->json())->firstWhere('name', 'Beta')['cover_image'];

    expect($coverA['id'])->toBe($mediaA->id)
        ->and($coverB['id'])->toBe($mediaB->id)
        ->and($coverA['url'])->not->toBe($coverB['url']);
});

it('ignores unpublished and floor plan media for cover', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Internal Only']);

    BuildingMedia::factory()->for($building)->internal()->create([
        'published' => false,
        'mime_type' => 'image/png',
    ]);

    $internal = BuildingMedia::factory()->for($building)->internal()->published()->create([
        'sort_order' => 1,
        'mime_type' => 'image/png',
    ]);

    $response = $this->getJson('/api/public/buildings')
        ->assertOk();

    $cover = collect($response->json())->firstWhere('name', 'Internal Only')['cover_image'];

    expect($cover['id'])->toBe($internal->id);
});

it('shows published building detail by slug', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    $this->getJson("/api/public/buildings/{$building->slug}")
        ->assertOk()
        ->assertJsonPath('id', $building->id)
        ->assertJsonPath('slug', $building->slug);
});

it('returns 404 for unpublished building by slug', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);

    $this->getJson("/api/public/buildings/{$building->slug}")
        ->assertNotFound();
});

it('returns 404 for unknown building slug', function () {
    $this->getJson('/api/public/buildings/inexistente')
        ->assertNotFound();
});
