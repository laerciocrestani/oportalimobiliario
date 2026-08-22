<?php

/**
 * @see REQ-RES-005
 * @see REQ-RES-006
 * @see REQ-RES-007
 * @see REQ-RES-008
 * @see REQ-RES-009
 */
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Models\UserActivityEvent;
use App\Services\PreReservationService;
use Laravel\Sanctum\Sanctum;

it('creates pre-hold for available unit', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::PreHold->value)
        ->assertJsonPath('unit_id', $unit->id);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect(Reservation::query()->first()?->client_id)->toBeNull();
    assertUserActivity($broker, UserActivityAction::ReservationPreHoldCreated, $unit->code);
});

it('rejects pre-hold when unit is already held', function () {
    $tenant = Tenant::factory()->create();
    $brokerA = User::factory()->broker()->create();
    $brokerB = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    foreach ([$brokerA, $brokerB] as $broker) {
        UnitAccess::factory()->create([
            'tenant_id' => $tenant->id,
            'broker_id' => $broker->id,
            'unit_id' => $unit->id,
        ]);
        linkBrokerToTenant($broker, $tenant);
    }

    Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $brokerA->id,
    ]);

    Sanctum::actingAs($brokerB);

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Esta unidade acaba de ser pré-reservada por outro corretor.');
});

it('submits proposal from pre-hold via legacy confirm endpoint', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/confirm", validProposalPayload())
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect($reservation->fresh()->messages()->count())->toBe(0);
});

it('rejects confirm from another broker', function () {
    $tenant = Tenant::factory()->create();
    $brokerA = User::factory()->broker()->create();
    $brokerB = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $brokerA->id,
    ]);

    Sanctum::actingAs($brokerB);

    linkBrokerToTenant($brokerB, $tenant);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/confirm", validProposalPayload())
        ->assertForbidden();
});

it('rejects confirm when pre-hold expired', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->expired()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/confirm", validProposalPayload())
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Sua pré-reserva expirou. A unidade está disponível novamente.');
});

it('releases pre-hold and frees unit', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}/pre-hold")
        ->assertNoContent();

    expect(Reservation::query()->find($reservation->id))->toBeNull();
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
    assertUserActivity($broker, UserActivityAction::ReservationPreHoldCancelled, $unit->code, $reservation->id);
});

it('expires pre-holds via service', function () {
    $tenant = Tenant::factory()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->preHold()->expired()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
    ]);

    $count = app(PreReservationService::class)->expireDuePreHolds();

    expect($count)->toBe(1);
    expect(Reservation::query()->count())->toBe(0);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
    expect(UserActivityEvent::query()->count())->toBe(0);
});

it('runs expire pre-hold command', function () {
    $this->artisan('opim:expire-pre-reservations')->assertSuccessful();
});

it('returns pre_hold metadata on unit listing', function () {
    $tenant = Tenant::factory()->create();
    $brokerA = User::factory()->broker()->create();
    $brokerB = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '901',
        'status' => UnitStatus::PreReserved,
    ]);

    foreach ([$brokerA, $brokerB] as $broker) {
        BuildingAccess::factory()->create([
            'tenant_id' => $tenant->id,
            'broker_id' => $broker->id,
            'building_id' => $building->id,
        ]);
        linkBrokerToTenant($broker, $tenant);
    }

    Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $brokerA->id,
    ]);

    Sanctum::actingAs($brokerB);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonPath('0.pre_hold.held_by_me', false)
        ->assertJsonPath('0.status', UnitStatus::PreReserved->value);
});

it('prevents race condition when two brokers pre-hold simultaneously', function () {
    $tenant = Tenant::factory()->create();
    $brokerA = User::factory()->broker()->create();
    $brokerB = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    foreach ([$brokerA, $brokerB] as $broker) {
        UnitAccess::factory()->create([
            'tenant_id' => $tenant->id,
            'broker_id' => $broker->id,
            'unit_id' => $unit->id,
        ]);
        linkBrokerToTenant($broker, $tenant);
    }

    Sanctum::actingAs($brokerA);
    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])->assertCreated();

    Sanctum::actingAs($brokerB);
    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])->assertUnprocessable();

    expect(Reservation::query()->count())->toBe(1);
});

it('does not list pre-hold reservations without a client in broker index', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonCount(0);
});

it('attaches client to pre-hold without submitting a proposal', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/pre-hold", [
        'client_id' => $client->id,
        'observations' => 'Cliente visitou a unidade.',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::PreHold->value)
        ->assertJsonPath('client_id', $client->id)
        ->assertJsonPath('expires_at', null);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect($reservation->fresh()->messages()->count())->toBe(1);
    assertUserActivity($broker, UserActivityAction::ReservationPreHoldConfirmed, $client->name);

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.client.name', $client->name);
});

it('rejects attaching a client to another broker pre-hold', function () {
    $tenant = Tenant::factory()->create();
    $brokerA = User::factory()->broker()->create();
    $brokerB = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($brokerB, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $brokerA->id,
    ]);

    linkBrokerToTenant($brokerB, $tenant);

    Sanctum::actingAs($brokerB);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/pre-hold", [
        'client_id' => $client->id,
    ])->assertForbidden();
});

it('rejects attaching a client to an expired pre-hold', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->expired()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/pre-hold", [
        'client_id' => $client->id,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Sua pré-reserva expirou. A unidade está disponível novamente.');
});
