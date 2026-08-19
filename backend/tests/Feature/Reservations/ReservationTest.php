<?php

/**
 * @see REQ-RES-001
 * @see REQ-RES-002
 * @see REQ-RES-004
 */
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\ReservationMessage;
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

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
    ])
        ->assertCreated()
        ->assertJsonPath('unit_id', $unit->id)
        ->assertJsonPath('client_id', $client->id);

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    assertUserActivity($broker, UserActivityAction::ReservationCreated, $client->name);
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

    linkBrokerToTenant($broker, $tenant);

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

    linkBrokerToTenant($broker, $tenant);

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

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
    ])->assertForbidden();
});

it('rejects reservation without access', function () {
    $tenant = Tenant::factory()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();

    linkBrokerToTenant($broker, $tenant);

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
        'status' => ReservationStatus::Confirmed,
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

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}", [
        'reason' => 'Cliente desistiu da compra.',
    ])->assertNoContent();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
    expect($reservation->timelineEvents()->where('type', ReservationTimelineEventType::Cancelled)->first())
        ->not->toBeNull()
        ->payload->toMatchArray(['reason' => 'Cliente desistiu da compra.']);

    assertUserActivity($broker, UserActivityAction::ReservationCancelled, 'Cliente desistiu da compra.');

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::PreHold->value);
});

it('requires a reason to cancel a reservation', function () {
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

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['reason']);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::DepositPending);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
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

    linkBrokerToTenant($broker, $tenant);

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

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonPath('0.reservation.client.name', 'Maria Souza');
});

it('creates initial message when broker sends observations', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $response = $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
        'observations' => 'Cliente prefere unidade de canto.',
    ])->assertCreated();

    $reservationId = $response->json('id');

    expect(ReservationMessage::query()->where('reservation_id', $reservationId)->count())->toBe(1);
    expect(ReservationMessage::query()->first()?->body)->toBe('Cliente prefere unidade de canto.');
    assertUserActivity($broker, UserActivityAction::ReservationMessageSent, 'Cliente prefere unidade de canto.');
});

it('allows broker to read and reply reservation messages', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
        'body' => 'Podemos agendar visita.',
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/messages")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.body', 'Podemos agendar visita.');

    $this->postJson("/api/broker/reservations/{$reservation->id}/messages", [
        'body' => 'Perfeito, amanhã às 10h.',
    ])
        ->assertCreated()
        ->assertJsonPath('author.role', 'broker');

    assertUserActivity($broker, UserActivityAction::ReservationMessageSent, 'Perfeito, amanhã às 10h.');
});

it('rejects broker messages for reservation owned by another broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $otherBroker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $otherBroker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/messages")->assertForbidden();
    $this->postJson("/api/broker/reservations/{$reservation->id}/messages", [
        'body' => 'Teste',
    ])->assertForbidden();
});

it('lists reservations for owning broker only', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $otherBroker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create(['name' => 'Maria Souza']);
    $building = Building::factory()->for($tenant)->create(['name' => 'Torre Central']);
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '801',
        'status' => UnitStatus::Reserved,
    ]);
    $otherUnit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $otherUnit->id,
        'broker_id' => $otherBroker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.client.name', 'Maria Souza')
        ->assertJsonPath('0.unit.building.name', 'Torre Central')
        ->assertJsonPath('0.situation.current.key', 'deposit_window')
        ->assertJsonPath('0.situation.previous.label', 'Decisão do gestor')
        ->assertJsonPath('0.situation.next.label', 'Comprovante de pagamento');
});

it('returns pending replies count for broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/reservations/pending-replies-count')
        ->assertOk()
        ->assertJsonPath('count', 1);
});
