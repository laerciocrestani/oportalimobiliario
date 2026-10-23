<?php

/**
 * @see REQ-RDP-003
 * @see REQ-RDP-004
 */

use App\Enums\ReservationKanbanColumn;
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('submits a proposal draft into review with a business-hour deadline', function () {
    Storage::fake('local');

    $this->travelTo(CarbonImmutable::parse('2026-10-02 16:00:00', BusinessClock::TIMEZONE));

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

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => null,
        'status' => ReservationStatus::ProposalDraft,
        'expires_at' => null,
        'draft_expires_at' => now()->addMinutes(20),
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest())
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('proposal.client_name', 'Maria Silva')
        ->assertJsonPath('proposal.client_phone', '11999999999');

    $fresh = $reservation->fresh();

    expect($fresh->status)->toBe(ReservationStatus::ProposalPending)
        ->and($fresh->draft_expires_at)->toBeNull()
        ->and($fresh->review_deadline_at)->not->toBeNull()
        ->and($fresh->review_deadline_at->timezone(BusinessClock::TIMEZONE)->toDateTimeString())->toBe('2026-10-06 16:00:00')
        ->and($unit->fresh()->status)->toBe(UnitStatus::PreReserved);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.kanban_column', ReservationKanbanColumn::ProposalReview->value)
        ->assertJsonPath('0.status', ReservationStatus::ProposalPending->value);
});

it('rejects a proposal draft without name or phone', function (string $field) {
    Storage::fake('local');

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
        'client_id' => null,
        'status' => ReservationStatus::ProposalDraft,
        'expires_at' => null,
        'draft_expires_at' => now()->addMinutes(20),
    ]);

    Sanctum::actingAs($broker);

    $payload = validProposalRequest();
    $payload[$field] = '';

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalDraft);
})->with([
    'client_name',
    'client_phone',
]);

it('rejects a proposal draft after the twenty minutes', function () {
    Storage::fake('local');

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
        'client_id' => null,
        'status' => ReservationStatus::ProposalDraft,
        'expires_at' => null,
        'draft_expires_at' => now()->subMinute(),
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest())
        ->assertUnprocessable()
        ->assertJsonPath('message', 'O prazo de 20 minutos para enviar a proposta acabou. A unidade está disponível novamente.');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalDraft)
        ->and($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
});
