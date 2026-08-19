<?php

/**
 * @see REQ-WIZ-009
 */
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Floor;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('syncs building amenities and lists them on show', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $piscina = Amenity::factory()->create(['name' => 'Piscina', 'slug' => 'piscina']);
    $sauna = Amenity::factory()->create(['name' => 'Sauna', 'slug' => 'sauna']);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'amenity_ids' => [$sauna->id, $piscina->id],
    ])
        ->assertOk()
        ->assertJsonPath('amenities.0.slug', 'piscina')
        ->assertJsonPath('amenities.1.slug', 'sauna');

    expect($building->amenities()->pluck('amenities.id')->all())
        ->toEqualCanonicalizing([$piscina->id, $sauna->id]);

    $this->getJson("/api/builder/buildings/{$building->id}")
        ->assertOk()
        ->assertJsonCount(2, 'amenities')
        ->assertJsonPath('amenities.0.name', 'Piscina');
});

it('does not change building amenities when amenity_ids is omitted', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $amenity = Amenity::factory()->create();
    $building->amenities()->attach($amenity);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'name' => 'Residencial Atualizado',
    ])->assertOk();

    expect($building->amenities()->pluck('amenities.id')->all())->toBe([$amenity->id]);
});

it('clears building amenities when amenity_ids is an empty array', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $building->amenities()->attach(Amenity::factory()->create());

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'amenity_ids' => [],
    ])
        ->assertOk()
        ->assertJsonPath('amenities', []);

    expect($building->amenities()->count())->toBe(0);
});

it('rejects inactive amenities on the building', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $inactive = Amenity::factory()->inactive()->create();

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'amenity_ids' => [$inactive->id],
    ])->assertUnprocessable();
});

it('unions building and unit amenities without copying the building pivot onto the unit', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $shared = Amenity::factory()->create(['name' => 'Água quente', 'slug' => 'agua-quente']);
    $extra = Amenity::factory()->create(['name' => 'Closet', 'slug' => 'closet']);
    $building->amenities()->attach($shared);

    Sanctum::actingAs($user);

    $response = $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $tower->id,
        'code' => '101',
        'floor' => 1,
        'amenity_ids' => [$shared->id, $extra->id],
    ]);

    $response
        ->assertCreated()
        ->assertJsonCount(2, 'amenities')
        ->assertJsonPath('inherited_amenities.0.slug', 'agua-quente')
        ->assertJsonPath('extra_amenities.0.slug', 'closet')
        ->assertJsonCount(1, 'inherited_amenities')
        ->assertJsonCount(1, 'extra_amenities');

    expect($response->json('amenities.*.slug'))->toEqualCanonicalizing(['agua-quente', 'closet']);

    $unitId = $response->json('id');

    expect(Unit::query()->findOrFail($unitId)->amenities()->pluck('amenities.id')->all())
        ->toBe([$extra->id]);
});

it('keeps building amenities on the unit dto even when the client omits them', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $shared = Amenity::factory()->create(['name' => 'Piscina', 'slug' => 'piscina']);
    $extra = Amenity::factory()->create(['name' => 'Closet', 'slug' => 'closet']);
    $building->amenities()->attach($shared);
    $unit = Unit::factory()->for($tenant)->for($building)->for($tower)->create(['code' => '202']);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}/units/{$unit->id}", [
        'amenity_ids' => [$extra->id],
    ])
        ->assertOk()
        ->assertJsonCount(2, 'amenities')
        ->assertJsonPath('inherited_amenities.0.slug', 'piscina')
        ->assertJsonPath('extra_amenities.0.slug', 'closet');

    expect($unit->amenities()->pluck('amenities.id')->all())->toBe([$extra->id]);
});

it('rejects inactive amenities on the unit', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->for($tower)->create();
    $inactive = Amenity::factory()->inactive()->create();

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}/units/{$unit->id}", [
        'amenity_ids' => [$inactive->id],
    ])->assertUnprocessable();
});

it('resolves finishing defaults from the building when the unit value is null', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'ceiling_type' => 'plaster',
        'opening_type' => 'aluminum',
        'flooring_type' => 'porcelain',
        'solar_position' => 'north',
        'sun_period' => 'morning',
    ]);
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->for($tower)->create([
        'ceiling_type' => null,
        'opening_type' => null,
        'flooring_type' => null,
        'solar_position' => null,
        'sun_period' => null,
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}/units/{$unit->id}")
        ->assertOk()
        ->assertJsonPath('ceiling_type', null)
        ->assertJsonPath('resolved_defaults.ceiling_type', 'plaster')
        ->assertJsonPath('resolved_defaults.opening_type', 'aluminum')
        ->assertJsonPath('resolved_defaults.flooring_type', 'porcelain')
        ->assertJsonPath('resolved_defaults.solar_position', 'north')
        ->assertJsonPath('resolved_defaults.sun_period', 'morning');
});

it('keeps unit finishing overrides in resolved_defaults', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['ceiling_type' => 'plaster']);
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->for($tower)->create([
        'ceiling_type' => 'wood',
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}/units/{$unit->id}")
        ->assertOk()
        ->assertJsonPath('ceiling_type', 'wood')
        ->assertJsonPath('resolved_defaults.ceiling_type', 'wood');
});

it('prunes unit extras that become building amenities', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->for($tower)->create();
    $amenity = Amenity::factory()->create();
    $unit->amenities()->attach($amenity);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'amenity_ids' => [$amenity->id],
    ])->assertOk();

    expect($unit->amenities()->pluck('amenities.id')->all())->toBe([]);

    $this->getJson("/api/builder/buildings/{$building->id}/units/{$unit->id}")
        ->assertOk()
        ->assertJsonPath('amenities.0.id', $amenity->id)
        ->assertJsonCount(0, 'extra_amenities');
});

it('does not copy building amenities onto units when replacing the unit grid', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'published' => false,
        'wizard_step' => 2,
    ]);
    $tower = Tower::factory()->for($tenant)->for($building)->create([
        'name' => 'Torre A',
        'floors_count' => 1,
    ]);
    Floor::factory()->for($tower)->create(['number' => 1]);
    $shared = Amenity::factory()->create(['name' => 'Piscina', 'slug' => 'piscina']);
    $building->amenities()->attach($shared);

    Sanctum::actingAs($user);

    $response = $this->putJson("/api/builder/buildings/{$building->id}/unit-grid", [
        'towers' => [
            [
                'id' => $tower->id,
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
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('amenities.0.slug', 'piscina')
        ->assertJsonPath('units.0.amenities.0.slug', 'piscina')
        ->assertJsonPath('units.0.extra_amenities', []);

    $unit = Unit::query()->where('building_id', $building->id)->firstOrFail();

    expect($unit->amenities()->count())->toBe(0);
});
