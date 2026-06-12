<?php

/**
 * @see REQ-RES-001
 * @see REQ-RES-002
 * @see REQ-RES-004
 */
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Services\ReservationExpirationService;
use Laravel\Sanctum\Sanctum;

it('creates reservation for accessible unit with client', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
    ])
        ->assertCreated()
        ->assertJsonPath('unit_id', $unit->id)
        ->assertJsonPath('client_id', $client->id);

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
});

it('creates reservation with building access only', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Available]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
    ])->assertCreated();

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
});

it('rejects reservation without client_id', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', ['unit_id' => $unit->id])
        ->assertUnprocessable();
});

it('rejects reservation with client from another broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $otherBroker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($otherBroker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
    ])->assertForbidden();
});

it('rejects reservation without access', function () {
    $unit = Unit::factory()->create(['status' => UnitStatus::Available]);
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
    ])->assertForbidden();
});

it('expires reservations and frees unit', function () {
    $tenant = Tenant::factory()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'expires_at' => now()->subMinute(),
    ]);

    $count = app(ReservationExpirationService::class)->expireDueReservations();

    expect($count)->toBe(1);
    expect(Reservation::query()->count())->toBe(0);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
});

it('runs expire command', function () {
    $this->artisan('opim:expire-reservations')->assertSuccessful();
});

it('cancels reservation for owning broker and frees unit', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}")
        ->assertNoContent();

    expect(Reservation::query()->find($reservation->id))->toBeNull();
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
});

it('rejects cancel reservation from another broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $otherBroker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $otherBroker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}")
        ->assertForbidden();
});

it('lists unit reservation with client for broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create(['name' => 'Maria Souza']);
    $unit = Unit::factory()->for($tenant)->create([
        'code' => '501',
        'status' => UnitStatus::Reserved,
    ]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonPath('0.reservation.client.name', 'Maria Souza');
});
