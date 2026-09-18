<?php

/**
 * @see REQ-RPF-016
 * @see REQ-RPF-017
 */
use App\Enums\ReservationKanbanColumn;
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('includes kanban column and allowed moves on the builder reservation list', function () {
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

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', ReservationKanbanColumn::ProposalReview->value)
        ->assertJsonPath('0.allowed_kanban_moves', [
            ReservationKanbanColumn::Cancelled->value,
            ReservationKanbanColumn::ProposalFormalization->value,
        ]);
});

it('maps accepted proposal awaiting signed return to formalization', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'status' => ReservationStatus::DepositPending,
        'expires_at' => null,
    ]);

    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', ReservationKanbanColumn::ProposalFormalization->value);
});

it('lets the broker attempt a proposal move and rejects it as action required', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($broker);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::ProposalReview->value,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'action_required')
        ->assertJsonPath('action', 'submit_proposal');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::PreHold);
});

it('rejects an invalid kanban jump without mutating status', function () {
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

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Sold->value,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'invalid_transition');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalPending);
});

it('cancels the reservation when the builder moves it to cancelled with a reason', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
        'reason' => 'Cliente desistiu.',
    ])
        ->assertOk()
        ->assertJsonPath('kanban_column', ReservationKanbanColumn::Cancelled->value)
        ->assertJsonPath('status', ReservationStatus::Cancelled->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
});

it('asks for a cancel reason instead of dropping the hold silently', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'action_required')
        ->assertJsonPath('action', 'drop_hold');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::PreHold);
});

it('marks the unit sold when the builder moves a completed contract to sold', function () {
    [
        'builder' => $builder,
        'witness1' => $witness1,
        'witness2' => $witness2,
        'reservation' => $reservation,
        'unit' => $unit,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness1);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")->assertOk();
    Sanctum::actingAs($witness2);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/2/sign")->assertOk();

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Sold->value,
    ])
        ->assertOk()
        ->assertJsonPath('kanban_column', ReservationKanbanColumn::Sold->value)
        ->assertJsonPath('status', ReservationStatus::Sold->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Sold);
    expect($unit->fresh()->status)->toBe(UnitStatus::Sold);
});

it('returns the same list item when the column does not change', function () {
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

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::ProposalReview->value,
    ])
        ->assertOk()
        ->assertJsonPath('id', $reservation->id)
        ->assertJsonPath('kanban_column', ReservationKanbanColumn::ProposalReview->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalPending);
});

it('forbids moving kanban without reservations.cancel', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([])->for($tenant)->create();
    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
        'reason' => 'Sem permissão.',
    ])->assertForbidden();
});

it('forbids a witness from moving the kanban column', function () {
    [
        'witness1' => $witness1,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness1);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
        'reason' => 'Testemunha tentou cancelar.',
    ])->assertForbidden();
});

it('forbids a broker from moving another broker reservation', function () {
    $tenant = Tenant::factory()->create();
    $owner = User::factory()->broker()->create();
    $other = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    linkBrokerToTenant($owner, $tenant);
    linkBrokerToTenant($other, $tenant);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $owner->id,
    ]);

    Sanctum::actingAs($other);

    $this->patchJson("/api/broker/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
        'reason' => 'Não é minha.',
    ])->assertForbidden();
});

it('isolates kanban moves across tenants', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenantA)->create();
    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenantB->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
        'reason' => 'Outro tenant.',
    ])->assertNotFound();
});

it('requires authentication to move a kanban column', function () {
    $reservation = Reservation::factory()->proposalPending()->create();

    $this->patchJson("/api/builder/reservations/{$reservation->id}/kanban", [
        'column' => ReservationKanbanColumn::Cancelled->value,
        'reason' => 'Sem login.',
    ])->assertUnauthorized();
});
