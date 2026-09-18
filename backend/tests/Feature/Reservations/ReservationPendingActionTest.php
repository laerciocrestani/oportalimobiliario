<?php

/**
 * @see REQ-RPF-015
 */
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('counts pending actions for the builder manager including proposal decision', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1)
        ->assertJsonPath('witness_scope', false);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.needs_action', true)
        ->assertJsonPath('0.pending_action', 'proposal_decision')
        ->assertJsonPath('0.needs_proposal_decision', true);
});

it('does not double-count a reservation that also has a pending reply', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1);

    $this->getJson('/api/builder/reservations/pending-replies-count')
        ->assertOk()
        ->assertJsonPath('count', 1);
});

it('counts a witness signature pending only for the assigned teammate', function () {
    [
        'builder' => $builder,
        'witness1' => $witness1,
        'witness2' => $witness2,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness1);
    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1)
        ->assertJsonPath('witness_scope', true);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.needs_action', true)
        ->assertJsonPath('0.pending_action', 'witness_signature')
        ->assertJsonPath('0.needs_witness_signature', true);

    Sanctum::actingAs($witness2);
    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 0)
        ->assertJsonPath('witness_scope', true);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 0);
});

it('counts sold validation after both witnesses sign', function () {
    [
        'builder' => $builder,
        'witness1' => $witness1,
        'witness2' => $witness2,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness1);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")->assertOk();
    Sanctum::actingAs($witness2);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/2/sign")->assertOk();

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.needs_sold_validation', true)
        ->assertJsonPath('0.pending_action', 'sold_validation')
        ->assertJsonPath('0.needs_action', true);
});

it('counts broker pending contract upload after GOV registration', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();

    $this->getJson('/api/broker/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1)
        ->assertJsonPath('witness_scope', false);

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.needs_action', true)
        ->assertJsonPath('0.pending_action', 'upload_signed_contract');
});

it('keeps pending-actions isolated by tenant', function () {
    $tenant = Tenant::factory()->create();
    $otherTenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $foreignBuilder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($otherTenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($foreignBuilder);
    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 0);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1);
});

it('returns zero pending actions for a builder without reservation access', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 0)
        ->assertJsonPath('witness_scope', false);

    $this->getJson('/api/builder/reservations')->assertForbidden();
});

it('asks the broker to start dialogue when pre-hold has no messages', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = listedPreHoldSetup();

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.pending_action', 'start_dialogue')
        ->assertJsonPath('0.needs_action', true)
        ->assertJsonPath('0.needs_reply', false)
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');

    $this->getJson('/api/broker/reservations/pending-actions-count')
        ->assertOk()
        ->assertJsonPath('count', 1);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.needs_action', false)
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('asks the builder to reply when the broker started pre-hold with a message', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = listedPreHoldSetup();

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
        'body' => 'Cliente prefere unidade de canto.',
    ]);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.pending_action', 'reply')
        ->assertJsonPath('0.needs_reply', true)
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.needs_reply', false)
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');
});

it('asks the broker to continue when the builder already replied on pre-hold', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = listedPreHoldSetup();

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
        'body' => 'Podemos avançar com a proposta?',
    ]);
    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
        'body' => 'Pode enviar a documentação.',
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'reply')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

/**
 * @return array{builder: User, broker: User, reservation: Reservation}
 */
function listedPreHoldSetup(): array
{
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
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
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    return compact('builder', 'broker', 'reservation');
}
