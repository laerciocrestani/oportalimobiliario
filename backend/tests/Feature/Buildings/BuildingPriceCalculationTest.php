<?php

/**
 * @see REQ-WIZ-009
 * @see REQ-WIZ-011
 * @see REQ-WIZ-016
 * @see REQ-WZR-010
 */
use App\Enums\FloorKind;
use App\Enums\UnitStatus;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Floor;
use App\Models\InccIndex;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function seedInccCurve(): void
{
    InccIndex::factory()->create(['competence' => '2026-02-01', 'value' => '1000.000000']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1020.500000']);
}

it('serializes the calculated price on builder unit endpoints', function () {
    seedInccCurve();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '101',
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}/units")
        ->assertOk()
        ->assertJsonPath('0.price', '102050.00')
        ->assertJsonPath('0.price_base', '100000.00')
        ->assertJsonPath('0.price_incc_current', '1020.500000');

    $this->getJson("/api/builder/buildings/{$building->id}")
        ->assertOk()
        ->assertJsonPath('units.0.price', '102050.00')
        ->assertJsonPath('units.0.price_base', '100000.00');

    expect($unit->fresh()->price)->toBe('100000.00');
});

it('serializes the calculated price on broker unit list', function () {
    seedInccCurve();

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $amenity = Amenity::factory()->create(['name' => 'Piscina']);
    $building->amenities()->attach($amenity);
    Unit::factory()->for($tenant)->for($building)->create([
        'code' => '202',
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
        'bedrooms' => 2,
        'area_m2' => 72,
    ]);

    linkBrokerToTenant($broker, $tenant);
    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonPath('0.price', '102050.00')
        ->assertJsonPath('0.price_base', '100000.00')
        ->assertJsonPath('0.price_incc_current', '1020.500000')
        ->assertJsonPath('0.bedrooms', 2)
        ->assertJsonPath('0.amenities.0.name', 'Piscina');
});

it('serializes the calculated price on public listing and detail', function () {
    seedInccCurve();

    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Public Price']);
    $amenity = Amenity::factory()->create(['name' => 'Piscina']);
    $building->amenities()->attach($amenity);
    Unit::factory()->for($tenant)->for($building)->create([
        'code' => '303',
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
        'area_m2' => 72,
        'bedrooms' => 2,
        'bathrooms' => 1,
        'status' => UnitStatus::Available,
    ]);

    $this->getJson('/api/public/buildings')
        ->assertOk()
        ->assertJsonPath('0.cheapest_unit.code', '303')
        ->assertJsonPath('0.cheapest_unit.price', '102050.00')
        ->assertJsonPath('0.cheapest_unit.price_base', '100000.00')
        ->assertJsonPath('0.cheapest_unit.price_incc_current', '1020.500000');

    $this->getJson("/api/public/buildings/{$building->slug}")
        ->assertOk()
        ->assertJsonPath('units.0.price', '102050.00')
        ->assertJsonPath('units.0.price_base', '100000.00')
        ->assertJsonPath('units.0.price_incc_current', '1020.500000')
        ->assertJsonPath('units.0.bedrooms', 2)
        ->assertJsonPath('units.0.amenities.0.name', 'Piscina');
});

it('serializes frozen_price_brl as price on builder and public apis', function () {
    seedInccCurve();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create();
    Unit::factory()->for($tenant)->for($building)->create([
        'code' => '404',
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
        'frozen_price_brl' => 555000,
        'status' => UnitStatus::Available,
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}/units")
        ->assertOk()
        ->assertJsonPath('0.price', '555000.00')
        ->assertJsonPath('0.price_base', '100000.00');

    $this->getJson("/api/public/buildings/{$building->slug}")
        ->assertOk()
        ->assertJsonPath('units.0.price', '555000.00');
});

it('serializes calculated garage price and floor kind on the building dto', function () {
    seedInccCurve();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create(['name' => 'Torre A']);
    Floor::factory()->for($tenant)->for($tower)->garage()->create([
        'number' => -1,
        'customized' => true,
    ]);
    Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $tower->id,
        'code' => 'S1-01',
        'floor' => -1,
        'price' => 45000,
        'price_base' => 45000,
        'price_competence' => '2026-02-01',
        'status' => UnitStatus::Available,
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/builder/buildings/{$building->id}")
        ->assertOk()
        ->assertJsonPath('towers.0.floors.0.number', -1)
        ->assertJsonPath('towers.0.floors.0.kind', FloorKind::Garage->value)
        ->assertJsonPath('towers.0.floors.0.customized', true)
        ->assertJsonPath('units.0.code', 'S1-01')
        ->assertJsonPath('units.0.price', '45922.50')
        ->assertJsonPath('units.0.price_base', '45000.00');
});

it('rejects publishing when an available garage spot has no price_base', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    Floor::factory()->for($tenant)->for($tower)->garage()->create(['number' => -1]);
    Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $tower->id,
        'code' => 'S1-01',
        'floor' => -1,
        'status' => UnitStatus::Available,
        'price' => 45000,
        'price_base' => null,
    ]);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'published' => true,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['published']);

    expect($building->fresh()->published)->toBeFalse();
});
