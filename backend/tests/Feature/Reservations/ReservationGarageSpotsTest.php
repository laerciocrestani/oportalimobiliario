<?php

/**
 * @see REQ-RGS-001
 * @see REQ-RGS-002
 * @see REQ-RGS-003
 * @see REQ-RGS-004
 */
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Services\PreReservationService;
use Laravel\Sanctum\Sanctum;

function garageSpotFor(Building $building, Tenant $tenant, string $code = 'S1-01', UnitStatus $status = UnitStatus::Available): Unit
{
    return Unit::factory()
        ->for($tenant)
        ->for($building)
        ->garage($code)
        ->create([
            'status' => $status,
            'code' => $code,
            'price' => 45000,
            'price_base' => 45000,
            'private_area_m2' => 12.5,
        ]);
}

it('creates pre-hold with optional garage spots', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);
    $garageA = garageSpotFor($building, $tenant, 'S1-01');
    $garageB = garageSpotFor($building, $tenant, 'S1-02');

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', [
        'unit_id' => $unit->id,
        'garage_unit_ids' => [$garageA->id, $garageB->id],
    ])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::PreHold->value)
        ->assertJsonPath('garage_units.0.code', 'S1-01')
        ->assertJsonPath('garage_units.1.code', 'S1-02');

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved)
        ->and($garageA->fresh()->status)->toBe(UnitStatus::PreReserved)
        ->and($garageB->fresh()->status)->toBe(UnitStatus::PreReserved)
        ->and(Reservation::query()->first()?->garageUnits()->count())->toBe(2);
});

it('creates pre-hold without garage spots', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('garage_units', []);
});

it('rejects pre-hold when primary unit is a garage spot', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $garage = garageSpotFor($building, $tenant);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $garage->id])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'A unidade principal da reserva não pode ser uma vaga de garagem.');
});

it('rejects garage spot from another building', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $buildingA = Building::factory()->for($tenant)->create();
    $buildingB = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($buildingA)->create(['status' => UnitStatus::Available]);
    $garage = garageSpotFor($buildingB, $tenant);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $buildingA->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', [
        'unit_id' => $unit->id,
        'garage_unit_ids' => [$garage->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'As vagas devem pertencer ao mesmo empreendimento da unidade.');
});

it('rejects occupied garage spot', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);
    $garage = garageSpotFor($building, $tenant, 'S1-01', UnitStatus::PreReserved);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', [
        'unit_id' => $unit->id,
        'garage_unit_ids' => [$garage->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Esta unidade acaba de ser pré-reservada por outro corretor.');
});

it('rejects non-garage unit as garage_unit_ids', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);
    $other = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', [
        'unit_id' => $unit->id,
        'garage_unit_ids' => [$other->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Somente unidades de garagem podem ser atreladas como vaga.');
});

it('releases garage spots when pre-hold is cancelled', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);
    $garage = garageSpotFor($building, $tenant);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $response = $this->postJson('/api/broker/reservations/pre-hold', [
        'unit_id' => $unit->id,
        'garage_unit_ids' => [$garage->id],
    ])->assertCreated();

    $reservationId = $response->json('id');

    $this->deleteJson("/api/broker/reservations/{$reservationId}/pre-hold")
        ->assertNoContent();

    expect($unit->fresh()->status)->toBe(UnitStatus::Available)
        ->and($garage->fresh()->status)->toBe(UnitStatus::Available)
        ->and(\Illuminate\Support\Facades\DB::table('reservation_garage_units')->count())->toBe(0);
});

it('releases garage spots when pre-hold expires', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::PreReserved]);
    $garage = garageSpotFor($building, $tenant, 'S1-01', UnitStatus::PreReserved);

    $reservation = Reservation::factory()->preHold()->expired()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    $reservation->garageUnits()->attach($garage->id, ['tenant_id' => $tenant->id]);

    $count = app(PreReservationService::class)->expireDuePreHolds();

    expect($count)->toBe(1)
        ->and($unit->fresh()->status)->toBe(UnitStatus::Available)
        ->and($garage->fresh()->status)->toBe(UnitStatus::Available)
        ->and(\Illuminate\Support\Facades\DB::table('reservation_garage_units')->count())->toBe(0);
});

it('exposes floor_kind on broker unit listing', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);
    $garage = garageSpotFor($building, $tenant);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $response = $this->getJson('/api/broker/units')->assertOk();

    $codes = collect($response->json())->keyBy('code');

    expect($codes[$unit->code]['floor_kind'] ?? null)->toBeNull()
        ->and($codes[$garage->code]['floor_kind'])->toBe('garage');
});
