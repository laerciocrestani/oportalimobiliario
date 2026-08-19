<?php

/**
 * @see REQ-WIZ-005
 * @see REQ-WIZ-006
 * @see REQ-WIZ-007
 */
use App\Models\Building;
use App\Models\Floor;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function makeDraftTower(Tenant $tenant, Building $building, string $name, int $floorsCount): Tower
{
    $tower = Tower::factory()->for($tenant)->for($building)->create([
        'name' => $name,
        'floors_count' => $floorsCount,
    ]);

    for ($number = 1; $number <= $floorsCount; $number++) {
        Floor::factory()->for($tower)->create(['number' => $number]);
    }

    return $tower->fresh(['floors']) ?? $tower;
}

it('generates units from typical floor plan per tower', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 2,
    ]);
    $towerA = makeDraftTower($tenant, $building, 'Torre A', 2);
    $towerB = makeDraftTower($tenant, $building, 'Torre B', 1);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $towerA->id,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [
                            ['code' => '101', 'area_m2' => 72.5],
                            ['code' => '102', 'area_m2' => 85],
                            ['code' => '103', 'area_m2' => 85],
                            ['code' => '104', 'area_m2' => 90],
                        ],
                    ],
                    [
                        'number' => 2,
                        'kind' => 'commercial',
                        'units' => [
                            ['code' => '201', 'area_m2' => 72.5],
                            ['code' => '202', 'area_m2' => 85],
                            ['code' => '203', 'area_m2' => 85],
                        ],
                    ],
                ],
            ],
            [
                'id' => $towerB->id,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [
                            ['code' => '101'],
                        ],
                    ],
                ],
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('wizard_step', 3)
        ->assertJsonPath('units_summary.total', 8)
        ->assertJsonCount(8, 'units')
        ->assertJsonPath('towers.0.floors.1.kind', 'commercial');

    expect((float) Unit::query()->where('tower_id', $towerA->id)->where('code', '101')->value('area_m2'))->toBe(72.5)
        ->and((float) Unit::query()->where('tower_id', $towerA->id)->where('code', '201')->value('area_m2'))->toBe(72.5)
        ->and(Unit::query()->where('tower_id', $towerA->id)->count())->toBe(7)
        ->and(Unit::query()->where('tower_id', $towerB->id)->pluck('code')->all())->toBe(['101'])
        ->and(Unit::query()->where('code', '101')->where('tower_id', $towerA->id)->value('floor_id'))
        ->not->toBeNull();
});

it('rejects a floor with zero units', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);
    $tower = makeDraftTower($tenant, $building, 'Torre A', 1);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [],
                    ],
                ],
            ],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['towers.0.floors.0.units']);
});

it('rejects unit grid on a published building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create();
    $tower = makeDraftTower($tenant, $building, 'Torre A', 1);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [['code' => '101']],
                    ],
                ],
            ],
        ],
    ])->assertConflict();
});

it('requires authentication to replace unit grid', function () {
    $building = Building::factory()->create();

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [],
    ])->assertUnauthorized();
});

it('denies unit grid replace to non builder', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => 1,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [['code' => '101']],
                    ],
                ],
            ],
        ],
    ])->assertForbidden();
});

it('isolates unit grid replace between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $building = Building::factory()->for($beta)->create(['published' => false]);
    $tower = makeDraftTower($beta, $building, 'Torre A', 1);

    Sanctum::actingAs($alphaUser);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [['code' => '101']],
                    ],
                ],
            ],
        ],
    ])->assertNotFound();
});
