<?php

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 */
use App\Models\Building;
use App\Models\Tenant;

it('lists only published buildings without auth', function () {
    $tenant = Tenant::factory()->create();
    Building::factory()->for($tenant)->published()->create(['name' => 'Published']);
    Building::factory()->for($tenant)->create(['name' => 'Draft', 'published' => false]);

    $this->getJson('/api/public/buildings')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Published');
});

it('shows published building detail', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    $this->getJson("/api/public/buildings/{$building->id}")
        ->assertOk()
        ->assertJsonPath('id', $building->id);
});

it('returns 404 for unpublished building', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);

    $this->getJson("/api/public/buildings/{$building->id}")
        ->assertNotFound();
});
