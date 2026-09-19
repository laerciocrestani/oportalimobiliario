<?php

/**
 * @see REQ-RKQ-001
 * @see REQ-RKQ-002
 * @see REQ-RKQ-003
 * @see REQ-RKQ-004
 * @see REQ-RKQ-006
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('counts unread messages from the other party and ignores own messages', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup();

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
        'body' => 'Primeira',
    ]);
    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
        'body' => 'Segunda',
    ]);
    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
        'body' => 'Resposta do corretor',
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.unread_messages_count', 2)
        ->assertJsonPath('0.needs_reply', true);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.unread_messages_count', 1)
        ->assertJsonPath('0.needs_reply', true);
});

it('marks messages as read for the viewer who opens the timeline without affecting another manager', function () {
    [
        'tenant' => $tenant,
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup();

    $otherBuilder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();

    ReservationMessage::factory()->count(2)->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);
    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")->assertOk();

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.unread_messages_count', 0)
        ->assertJsonPath('0.needs_reply', false);

    Sanctum::actingAs($otherBuilder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.unread_messages_count', 2)
        ->assertJsonPath('0.needs_reply', true);
});

it('marks messages as read when the viewer posts a reply', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup();

    ReservationMessage::factory()->count(2)->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/messages", [
        'body' => 'Recebido, obrigado.',
    ])->assertCreated();

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.unread_messages_count', 0)
        ->assertJsonPath('0.needs_reply', false);
});

it('keeps proposal_pending waiting on builder and does not treat unread as reply pending_action', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup(ReservationStatus::ProposalPending);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    ReservationMessage::factory()->count(2)->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('0.kanban_column', 'proposal_review')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder')
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.needs_action', false)
        ->assertJsonPath('0.unread_messages_count', 2)
        ->assertJsonPath('0.needs_reply', true);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'builder')
        ->assertJsonPath('0.pending_action', 'proposal_decision')
        ->assertJsonPath('0.unread_messages_count', 0);
});

it('keeps pre-hold queue on the broker when there are no messages', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
    ] = kanbanQueueSetup();

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'start_dialogue')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker')
        ->assertJsonPath('0.unread_messages_count', 0);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('asks the builder to reply on pre-hold after the broker messages', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup();

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'reply')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder')
        ->assertJsonPath('0.unread_messages_count', 1);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.situation.current.waiting_on', 'builder')
        ->assertJsonPath('0.unread_messages_count', 0);
});

it('asks the broker to continue on pre-hold after the builder replies', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup();

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
    ]);
    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'reply')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker')
        ->assertJsonPath('0.unread_messages_count', 1);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.situation.current.waiting_on', 'broker')
        ->assertJsonPath('0.unread_messages_count', 1);
});

it('puts the ball back on the broker when a proposal is returned', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
    ] = kanbanQueueSetup(ReservationStatus::ProposalPending);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);
    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Returned->value,
        'decision_note' => 'Ajuste o valor da entrada.',
    ])->assertOk();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalReturned);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.status', ReservationStatus::ProposalReturned->value)
        ->assertJsonPath('0.kanban_column', 'proposal_review')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker')
        ->assertJsonPath('0.pending_action', 'submit_proposal');

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'proposal_review')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker')
        ->assertJsonPath('0.pending_action', null);
});

it('cancels the reservation when the proposal is rejected', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'reservation' => $reservation,
        'unit' => $unit,
    ] = kanbanQueueSetup(ReservationStatus::ProposalPending);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);
    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Rejected->value,
        'decision_note' => 'Fora da política.',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::Cancelled->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'cancelled')
        ->assertJsonPath('0.situation.current.waiting_on', null);
});

/**
 * @return array{tenant: Tenant, builder: User, broker: User, reservation: Reservation, unit: Unit}
 */
function kanbanQueueSetup(?ReservationStatus $status = null): array
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

    $status ??= ReservationStatus::PreHold;

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'status' => $status,
        'expires_at' => $status === ReservationStatus::PreHold ? now()->addHours(48) : null,
    ]);

    return compact('tenant', 'builder', 'broker', 'reservation', 'unit');
}
