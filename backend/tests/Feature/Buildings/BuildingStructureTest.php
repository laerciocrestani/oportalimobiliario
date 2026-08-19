<?php

/**
 * @see REQ-WIZ-004
 */
use App\Models\Building;
use App\Models\Floor;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('replaces towers and floors on a draft building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 1,
    ]);
    Tower::factory()->for($tenant)->for($building)->create(['name' => 'Antiga']);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 3],
            ['name' => 'Torre B', 'floors_count' => 2],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('wizard_step', 2)
        ->assertJsonCount(2, 'towers')
        ->assertJsonPath('towers.0.name', 'Torre A')
        ->assertJsonPath('towers.0.floors_count', 3)
        ->assertJsonCount(3, 'towers.0.floors')
        ->assertJsonPath('towers.0.floors.0.number', 1)
        ->assertJsonPath('towers.0.floors.2.number', 3)
        ->assertJsonPath('towers.0.floors.0.kind', 'residential')
        ->assertJsonPath('towers.1.name', 'Torre B')
        ->assertJsonCount(2, 'towers.1.floors');

    expect(Tower::query()->where('building_id', $building->id)->count())->toBe(2)
        ->and(Floor::query()->count())->toBe(5)
        ->and(Tower::query()->where('name', 'Antiga')->exists())->toBeFalse();
});

it('rejects structure replace on a published building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create();

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 2],
        ],
    ])->assertConflict();
});

it('rejects structure replace when wizard is completed', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_completed_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 2],
        ],
    ])->assertConflict();
});

it('validates structure payload', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => '', 'floors_count' => 0],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['towers.0.name', 'towers.0.floors_count']);
});

it('requires authentication to replace structure', function () {
    $building = Building::factory()->create();

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 1],
        ],
    ])->assertUnauthorized();
});

it('denies structure replace to non builder', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 1],
        ],
    ])->assertForbidden();
});

it('isolates structure replace between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $building = Building::factory()->for($beta)->create(['published' => false]);

    Sanctum::actingAs($alphaUser);

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 1],
        ],
    ])->assertNotFound();
});
