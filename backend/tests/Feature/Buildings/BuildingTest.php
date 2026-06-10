<?php

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-005
 */
use App\Models\Building;
use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists buildings scoped to tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    $alphaUser = User::factory()->builder()->for($alpha)->create();
    Building::factory()->for($alpha)->create(['name' => 'Alpha Building']);
    Building::factory()->for($beta)->create(['name' => 'Beta Building']);

    Sanctum::actingAs($alphaUser);

    $this->getJson('/api/builder/buildings')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Alpha Building');
});

it('creates building for builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/buildings', [
        'name' => 'New Building',
        'published' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'New Building')
        ->assertJsonPath('published', true);

    expect(Building::query()->count())->toBe(1);
});

it('manages units nested under building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'code' => '501',
        'price' => 500000,
    ])
        ->assertCreated()
        ->assertJsonPath('code', '501')
        ->assertJsonPath('status', 'available');

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
    $alphaUser = User::factory()->builder()->for($alpha)->create();
    $building = Building::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->getJson("/api/builder/buildings/{$building->id}")
        ->assertNotFound();
});
