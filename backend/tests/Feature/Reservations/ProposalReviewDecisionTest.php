<?php

/**
 * @see REQ-RDP-004
 * @see REQ-RDP-005
 */

use App\Enums\ProposalDecision;
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('restarts the review deadline when the broker replaces the proposal', function () {
    Storage::fake('local');

    $this->travelTo(CarbonImmutable::parse('2026-10-02 16:00:00', BusinessClock::TIMEZONE));

    $tenant = Tenant::factory()->create();
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
        'review_deadline_at' => now()->subDay(),
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'version' => 1,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'payment_terms' => 'Pix R$ 15.000 + 18x R$ 4.000',
    ]))
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('proposal.version', 2);

    $fresh = $reservation->fresh();

    expect($fresh->status)->toBe(ReservationStatus::ProposalPending)
        ->and($fresh->review_deadline_at->timezone(BusinessClock::TIMEZONE)->toDateTimeString())->toBe('2026-10-06 16:00:00')
        ->and($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
});

it('adds business hours on top of the current deadline even during a pause', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-03 10:00:00', BusinessClock::TIMEZONE));

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
        'review_deadline_at' => CarbonImmutable::parse('2026-10-06 16:00:00', BusinessClock::TIMEZONE),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/extend", [
        'hours' => 10,
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value);

    expect($reservation->fresh()->review_deadline_at->timezone(BusinessClock::TIMEZONE)->toDateTimeString())
        ->toBe('2026-10-07 02:00:00')
        ->and($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
});

it('requires authentication to extend a proposal review', function () {
    $this->patchJson('/api/builder/reservations/1/proposal/extend', ['hours' => 2])
        ->assertUnauthorized();
});

it('forbids a builder without permission from extending a proposal review', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'review_deadline_at' => now()->addDay(),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/extend", [
        'hours' => 2,
    ])->assertForbidden();
});

it('rejects an extension when the proposal is not in review', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => null,
        'status' => ReservationStatus::ProposalDraft,
        'expires_at' => null,
        'draft_expires_at' => now()->addMinutes(20),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/extend", [
        'hours' => 2,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Não há proposta em análise para prorrogar.');
});

it('cancels the reservation and releases the unit when the review deadline passes', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $dueUnit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    $openUnit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $due = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $dueUnit->id,
        'broker_id' => $broker->id,
        'review_deadline_at' => now()->subMinute(),
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $due->id,
        'submitted_by' => $broker->id,
    ]);

    $open = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $openUnit->id,
        'broker_id' => $broker->id,
        'review_deadline_at' => now()->addDay(),
    ]);

    $this->artisan('opim:expire-proposal-reviews')->assertSuccessful();

    expect($due->fresh()->status)->toBe(ReservationStatus::Cancelled)
        ->and($due->proposals()->first()->decision)->toBe(ProposalDecision::Rejected)
        ->and($dueUnit->fresh()->status)->toBe(UnitStatus::Available)
        ->and($open->fresh()->status)->toBe(ReservationStatus::ProposalPending)
        ->and($openUnit->fresh()->status)->toBe(UnitStatus::PreReserved);

    $this->artisan('opim:expire-proposal-reviews')->assertSuccessful();

    expect($open->fresh()->status)->toBe(ReservationStatus::ProposalPending);
});

it('refuses a new proposal after the builder rejects the review', function () {
    Storage::fake('local');

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
        'review_deadline_at' => now()->addDay(),
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Rejected->value,
        'decision_note' => 'Fora da política.',
    ])->assertOk();

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest())
        ->assertUnprocessable();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
});
