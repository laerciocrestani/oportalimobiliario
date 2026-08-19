<?php

/**
 * @see REQ-WIZ-011
 * @see REQ-WIZ-016
 */
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\InccIndex;
use App\Models\Tenant;
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
    Unit::factory()->for($tenant)->for($building)->create([
        'code' => '202',
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
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
        ->assertJsonPath('0.price_incc_current', '1020.500000');
});

it('serializes the calculated price on public listing and detail', function () {
    seedInccCurve();

    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Public Price']);
    Unit::factory()->for($tenant)->for($building)->create([
        'code' => '303',
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
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
        ->assertJsonPath('units.0.price_incc_current', '1020.500000');
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
