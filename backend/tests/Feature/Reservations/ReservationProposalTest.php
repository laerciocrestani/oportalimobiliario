<?php

/**
 * @see REQ-RTL-005
 * @see REQ-RTL-008
 * @see REQ-RTL-009
 * @see REQ-RTL-010
 * @see REQ-RTL-011
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('submits proposal from pre-hold', function () {
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

    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal", validProposalPayload())
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('proposal.client_name', 'Maria Silva')
        ->assertJsonPath('expires_at', null);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect($reservation->fresh()->expires_at)->toBeNull();
    expect(ReservationProposal::query()->count())->toBe(1);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalSubmitted)->exists())->toBeTrue();
});

it('accepts proposal and opens deposit window', function () {
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

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::DepositPending->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect($reservation->fresh()->client_id)->not->toBeNull();
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::DepositWindowOpened)->exists())->toBeTrue();
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalAccepted)->exists())->toBeTrue();
});

it('rejects proposal and frees unit', function () {
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

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Rejected->value,
        'decision_note' => 'Perfil fora da política.',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::Cancelled->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'cancelled')
        ->assertJsonPath('steps.3.status', 'failed')
        ->assertJsonPath('steps.4.status', 'skipped');
});

it('allows a new pre-hold after proposal rejection', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Rejected->value,
    ])->assertOk();

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::PreHold->value);

    expect(Reservation::query()->count())->toBe(2);
});

it('returns proposal to broker for revision', function () {
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

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Returned->value,
        'decision_note' => 'Ajustar condições de pagamento.',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ProposalReturned->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
});

it('resubmits proposal after return with incremented version', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ProposalReturned,
        'client_id' => null,
        'expires_at' => now()->addMinutes(10),
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'version' => 1,
        'decision' => ProposalDecision::Returned,
        'submitted_by' => $broker->id,
        'decided_by' => User::factory()->builder()->for($tenant),
        'decided_at' => now(),
    ]);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal", validProposalPayload([
        'payment_terms' => 'Pix R$ 15.000 + 18x R$ 4.000',
    ]))
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('proposal.version', 2);
});

it('lists proposal pending reservations for builder', function () {
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
        ->assertJsonCount(1)
        ->assertJsonPath('0.status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('0.needs_proposal_decision', true);
});

it('forbids builder without permission from deciding proposal', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])->assertForbidden();
});
