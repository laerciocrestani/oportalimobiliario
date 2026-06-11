<?php

use App\Models\Building;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists towers for a building with units summary', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create(['name' => 'Torre A']);
    Unit::factory()->for($tenant)->for($building)->create(['tower_id' => $tower->id]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}/towers")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Torre A')
        ->assertJsonPath('0.units_summary.total', 1);
});

it('creates tower for building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/towers", [
        'name' => 'Torre B',
        'sort_order' => 1,
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Torre B')
        ->assertJsonPath('units_summary.total', 0);

    expect(Tower::query()->count())->toBe(1);
});

it('shows tower with ordered units and summary', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $tower->id,
        'code' => '101',
        'floor' => 1,
    ]);
    Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $tower->id,
        'code' => '201',
        'floor' => 2,
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}/towers/{$tower->id}")
        ->assertOk()
        ->assertJsonPath('units_summary.total', 2)
        ->assertJsonPath('units.0.code', '201')
        ->assertJsonPath('units.1.code', '101');
});

it('enforces unique unit code per tower', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $towerA = Tower::factory()->for($tenant)->for($building)->create(['name' => 'Torre A']);
    $towerB = Tower::factory()->for($tenant)->for($building)->create(['name' => 'Torre B']);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $towerA->id,
        'code' => '1201',
    ])->assertCreated();

    $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $towerB->id,
        'code' => '1201',
    ])->assertCreated();

    $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $towerA->id,
        'code' => '1201',
    ])->assertStatus(422);
});

it('isolates towers between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $building = Building::factory()->for($beta)->create();
    $tower = Tower::factory()->for($beta)->for($building)->create();

    Sanctum::actingAs($alphaUser);

    $this->getJson("/api/builder/buildings/{$building->id}/towers/{$tower->id}")
        ->assertNotFound();
});

it('prevents deleting tower with units', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    Unit::factory()->for($tenant)->for($building)->create(['tower_id' => $tower->id]);

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/buildings/{$building->id}/towers/{$tower->id}")
        ->assertStatus(422);
});
