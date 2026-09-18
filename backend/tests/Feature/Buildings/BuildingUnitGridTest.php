<?php

/**
 * @see REQ-WIZ-005
 * @see REQ-WIZ-006
 * @see REQ-WIZ-007
 * @see REQ-WZR-006
 * @see REQ-WZR-007
 */
use App\Enums\FloorKind;
use App\Models\Amenity;
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

/**
 * @param  list<array{number: int, kind?: string, customized?: bool}>  $floors
 */
function makeDraftTowerFloors(Tenant $tenant, Building $building, string $name, array $floors): Tower
{
    $aboveGround = count(array_filter(
        $floors,
        fn (array $floor): bool => $floor['number'] > 0,
    ));

    $tower = Tower::factory()->for($tenant)->for($building)->create([
        'name' => $name,
        'floors_count' => $aboveGround,
    ]);

    foreach ($floors as $floor) {
        Floor::factory()->for($tower)->create([
            'number' => $floor['number'],
            'kind' => $floor['kind'] ?? FloorKind::Residential,
            'customized' => $floor['customized'] ?? false,
        ]);
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

it('persists unit spec sheet and extra amenities without copying building amenities', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 2,
    ]);
    $tower = makeDraftTower($tenant, $building, 'Torre A', 1);
    $shared = Amenity::factory()->create(['slug' => 'piscina']);
    $extra = Amenity::factory()->create(['slug' => 'closet']);
    $building->amenities()->attach($shared);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'floors' => [
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [
                            [
                                'code' => '101',
                                'area_m2' => 78.5,
                                'total_area_m2' => 92,
                                'bedrooms' => 2,
                                'bathrooms' => 2,
                                'suites' => 1,
                                'price_base' => 610000,
                                'price_competence' => '2026-07-01',
                                'property_position' => 'front',
                                'ceiling_type' => 'wood',
                                'amenity_ids' => [$shared->id, $extra->id],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('units.0.bedrooms', 2)
        ->assertJsonPath('units.0.property_position', 'front')
        ->assertJsonPath('units.0.ceiling_type', 'wood')
        ->assertJsonPath('units.0.extra_amenities.0.slug', 'closet');

    $unit = Unit::query()->where('code', '101')->firstOrFail();

    expect((float) $unit->private_area_m2)->toBe(78.5)
        ->and((float) $unit->price_base)->toBe(610000.0)
        ->and($unit->amenities()->pluck('amenities.id')->all())->toBe([$extra->id]);
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

it('persists garage spots, ground-floor shops, customized floors and reference floor', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 2,
    ]);
    $tower = makeDraftTowerFloors($tenant, $building, 'Torre A', [
        ['number' => -1, 'kind' => FloorKind::Garage->value],
        ['number' => 0, 'kind' => FloorKind::Commercial->value],
        ['number' => 1, 'kind' => FloorKind::Residential->value],
    ]);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'reference_floor' => 1,
                'floors' => [
                    [
                        'number' => -1,
                        'kind' => 'garage',
                        'customized' => false,
                        'units' => [
                            [
                                'code' => 'S1-01',
                                'private_area_m2' => 12.5,
                                'price_base' => 45000,
                                'price_competence' => '2026-08-01',
                            ],
                        ],
                    ],
                    [
                        'number' => 0,
                        'kind' => 'commercial',
                        'customized' => false,
                        'units' => [
                            ['code' => 'L01', 'private_area_m2' => 38, 'price_base' => 210000],
                        ],
                    ],
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'customized' => true,
                        'units' => [
                            [
                                'code' => '101',
                                'private_area_m2' => 50,
                                'bedrooms' => 2,
                                'bathrooms' => 1,
                                'price_base' => 320000,
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('wizard_step', 3)
        ->assertJsonPath('towers.0.reference_floor', 1)
        ->assertJsonPath('towers.0.floors.0.number', -1)
        ->assertJsonPath('towers.0.floors.0.kind', 'garage')
        ->assertJsonPath('towers.0.floors.0.customized', false)
        ->assertJsonPath('towers.0.floors.1.number', 0)
        ->assertJsonPath('towers.0.floors.1.kind', 'commercial')
        ->assertJsonPath('towers.0.floors.2.customized', true);

    $spot = Unit::query()->where('tower_id', $tower->id)->where('code', 'S1-01')->first();
    $shop = Unit::query()->where('tower_id', $tower->id)->where('code', 'L01')->first();

    expect($spot)->not->toBeNull()
        ->and((float) $spot->private_area_m2)->toBe(12.5)
        ->and((float) $spot->price_base)->toBe(45000.0)
        ->and($spot->floor)->toBe(-1)
        ->and($shop)->not->toBeNull()
        ->and($shop->floor)->toBe(0)
        ->and($tower->fresh()->reference_floor)->toBe(1)
        ->and(Floor::query()->where('tower_id', $tower->id)->where('number', 1)->value('customized'))->toBeTrue();
});

it('generates unit codes for ground basement and apartment floors when omitted', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);
    $tower = makeDraftTowerFloors($tenant, $building, 'Torre A', [
        ['number' => -2, 'kind' => FloorKind::Garage->value],
        ['number' => 0, 'kind' => FloorKind::Commercial->value],
        ['number' => 1],
    ]);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'floors' => [
                    [
                        'number' => -2,
                        'kind' => 'garage',
                        'units' => [
                            ['private_area_m2' => 11],
                            ['private_area_m2' => 12],
                        ],
                    ],
                    [
                        'number' => 0,
                        'kind' => 'commercial',
                        'units' => [
                            ['private_area_m2' => 30],
                        ],
                    ],
                    [
                        'number' => 1,
                        'kind' => 'residential',
                        'units' => [
                            ['private_area_m2' => 50],
                        ],
                    ],
                ],
            ],
        ],
    ])
        ->assertOk();

    expect(Unit::query()->where('tower_id', $tower->id)->orderBy('code')->pluck('code')->all())
        ->toBe(['101', 'L01', 'S2-01', 'S2-02']);
});

it('rejects unit codes that do not match the floor numbering rules', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);
    $tower = makeDraftTowerFloors($tenant, $building, 'Torre A', [
        ['number' => -1, 'kind' => FloorKind::Garage->value],
    ]);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
                'floors' => [
                    [
                        'number' => -1,
                        'kind' => 'garage',
                        'units' => [
                            ['code' => '101', 'private_area_m2' => 12],
                        ],
                    ],
                ],
            ],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['towers.0.floors.0.units.0.code']);
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
