<?php

/**
 * @see REQ-RDP-001
 * @see REQ-RDP-002
 */

use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('creates a twenty minute proposal draft and locks the unit', function () {
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

    $this->postJson('/api/broker/reservations/draft', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ProposalDraft->value)
        ->assertJsonPath('unit_id', $unit->id);

    $reservation = Reservation::query()->first();

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved)
        ->and($reservation)->not->toBeNull()
        ->and($reservation->client_id)->toBeNull()
        ->and($reservation->draft_expires_at)->not->toBeNull()
        ->and($reservation->draft_expires_at->greaterThan(now()->addMinutes(19)))->toBeTrue()
        ->and($reservation->draft_expires_at->lessThanOrEqualTo(now()->addMinutes(20)))->toBeTrue();
});

it('rejects a second broker while the proposal draft holds the unit', function () {
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

    $this->postJson('/api/broker/reservations/draft', ['unit_id' => $unit->id])
        ->assertCreated();

    Sanctum::actingAs($brokerB);

    $this->postJson('/api/broker/reservations/draft', ['unit_id' => $unit->id])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Esta unidade acaba de ser reservada por outro corretor.');
});

it('requires authentication to start a proposal draft', function () {
    $this->postJson('/api/broker/reservations/draft', ['unit_id' => 1])
        ->assertUnauthorized();
});

it('rejects a proposal draft when the broker has no access to the unit', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/draft', ['unit_id' => $unit->id])
        ->assertForbidden();
});

it('discards an unsubmitted draft after twenty minutes and releases the unit', function () {
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

    $this->postJson('/api/broker/reservations/draft', ['unit_id' => $unit->id])
        ->assertCreated();

    $this->travel(21)->minutes();

    $this->artisan('opim:expire-proposal-drafts')->assertSuccessful();

    expect(Reservation::query()->count())->toBe(0)
        ->and($unit->fresh()->status)->toBe(UnitStatus::Available);
});

it('keeps a proposal draft that is still inside the twenty minutes', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => null,
        'status' => ReservationStatus::ProposalDraft,
        'expires_at' => null,
        'draft_expires_at' => now()->addMinutes(10),
    ]);

    $this->artisan('opim:expire-proposal-drafts')->assertSuccessful();

    expect(Reservation::query()->count())->toBe(1)
        ->and($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
});

it('hides the proposal draft from the builder reservation list', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $draftUnit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    $pendingUnit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $draftUnit->id,
        'broker_id' => $broker->id,
        'client_id' => null,
        'status' => ReservationStatus::ProposalDraft,
        'expires_at' => null,
        'draft_expires_at' => now()->addMinutes(20),
    ]);

    $pending = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $pendingUnit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', $pending->id);
});
