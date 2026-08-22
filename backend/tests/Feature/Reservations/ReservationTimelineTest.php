<?php

/**
 * @see REQ-RTL-024
 * @see REQ-RTL-025
 * @see REQ-RTL-029
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    app(PermissionRegistrar::class)->forgetCachedPermissions();
});

it('returns timeline for broker pre-hold with dialogue step current', function () {
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

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::PreHoldCreated,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('reservation_id', $reservation->id)
        ->assertJsonPath('current_stage', 'pre_hold')
        ->assertJsonPath('steps.0.key', 'pre_hold_created')
        ->assertJsonPath('steps.0.status', 'completed')
        ->assertJsonPath('steps.1.key', 'dialogue')
        ->assertJsonPath('steps.1.status', 'current')
        ->assertJsonPath('steps.1.actions', ['open_dialogue']);
});

it('returns timeline for confirmed reservation with deposit window current', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

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
        'client_id' => $client->id,
        'status' => ReservationStatus::Confirmed,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::DepositWindowOpened,
    ]);

    Sanctum::actingAs($broker);

    $response = $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'deposit_pending');

    $steps = $response->json('steps');
    $depositStep = collect($steps)->firstWhere('key', 'deposit_window');
    $decisionStep = collect($steps)->firstWhere('key', 'proposal_decision');

    expect($depositStep['status'])->toBe('current')
        ->and($depositStep['actions'])->toBe(['submit_deposit_proof'])
        ->and($depositStep['occurred_at'])->toBeString()->not->toBeEmpty()
        ->and($decisionStep['status'])->toBe('completed')
        ->and($decisionStep['occurred_at'])->toBeString()->not->toBeEmpty();
});

it('records pre-hold timeline event on create', function () {
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
        ->assertCreated();

    $reservation = Reservation::query()->first();

    expect(ReservationTimelineEvent::query()
        ->where('reservation_id', $reservation->id)
        ->where('type', ReservationTimelineEventType::PreHoldCreated)
        ->exists())->toBeTrue();
});

it('records dialogue event when broker posts message', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $client = BrokerClient::factory()->for($broker, 'broker')->create();

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
        'client_id' => $client->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/messages", [
        'body' => 'Cliente aguarda retorno.',
    ])->assertCreated();

    expect(ReservationTimelineEvent::query()
        ->where('reservation_id', $reservation->id)
        ->where('type', ReservationTimelineEventType::Dialogue)
        ->exists())->toBeTrue();
});

it('returns timeline for builder with permission', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['status' => UnitStatus::Reserved]);
    $client = BrokerClient::factory()->for($broker, 'broker')->create();

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('reservation_id', $reservation->id)
        ->assertJsonStructure(['current_stage', 'expires_at', 'unit', 'steps']);
});

it('forbids broker from viewing another brokers timeline', function () {
    $tenant = Tenant::factory()->create();
    $owner = User::factory()->broker()->create();
    $other = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $owner->id,
    ]);

    Sanctum::actingAs($other);

    $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertForbidden();
});

it('forbids builder without permission from viewing timeline', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertForbidden();
});

it('isolates builder timeline by tenant', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $builderA = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenantA)->create();
    $broker = User::factory()->broker()->create();
    $unitB = Unit::factory()->for($tenantB)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenantB->id,
        'unit_id' => $unitB->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builderA);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertNotFound();
});

it('includes timeline situation on builder reservation list', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ProposalSubmitted,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $response = $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.previous.label', 'Proposta enviada')
        ->assertJsonPath('0.situation.current.key', 'proposal_decision')
        ->assertJsonPath('0.situation.current.label', 'Decisão do gestor')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder')
        ->assertJsonPath('0.situation.next.label', 'Aguardando sinal (48h)')
        ->assertJsonPath('0.situation.next.occurred_at', null);

    expect($response->json('0.situation.previous.occurred_at'))->toBeString()->not->toBeEmpty();
});

it('fills occurred_at for completed manager decision on legacy confirmed reservation', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $createdAt = now()->subDays(2)->microsecond(0);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    $reservation->forceFill([
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ])->save();

    Sanctum::actingAs($builder);

    $response = $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.previous.key', 'proposal_decision')
        ->assertJsonPath('0.situation.previous.label', 'Decisão do gestor')
        ->assertJsonPath('0.situation.current.key', 'deposit_window')
        ->assertJsonPath('0.situation.next.occurred_at', null);

    expect($response->json('0.situation.previous.occurred_at'))->toBe($reservation->fresh()->created_at->toIso8601String())
        ->and($response->json('0.situation.current.occurred_at'))->toBeString()->not->toBeEmpty()
        ->and($response->json('0.situation.current.waiting_on'))->toBe('broker');
});

it('uses proposal decided_at when manager decision has no timeline event', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $decidedAt = now()->subHours(3)->microsecond(0);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'decision' => ProposalDecision::Accepted,
        'decided_by' => $builder->id,
        'decided_at' => $decidedAt,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.previous.key', 'proposal_decision')
        ->assertJsonPath('0.situation.previous.occurred_at', $decidedAt->toIso8601String());
});

it('keeps deposit proof on timeline after moving to contract data', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ContractDataPending,
    ]);

    ReservationAttachment::factory()->depositProof()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $broker->id,
        'original_name' => 'pix.pdf',
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_data_pending')
        ->assertJsonPath('attachments.0.kind', ReservationAttachmentKind::DepositProof->value)
        ->assertJsonPath('attachments.0.original_name', 'pix.pdf')
        ->assertJsonPath('current_deposit_proof.original_name', 'pix.pdf');
});

it('includes issued contract pdf on broker timeline attachments', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

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
        'status' => ReservationStatus::ContractDataPending,
    ]);

    ReservationAttachment::factory()->depositProof()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $broker->id,
        'original_name' => 'pix.pdf',
    ]);

    ReservationAttachment::factory()->contractPdf()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $broker->id,
        'original_name' => 'contrato.pdf',
    ]);

    Sanctum::actingAs($broker);

    $response = $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk();

    $kinds = collect($response->json('attachments'))->pluck('kind');

    expect($kinds)->toContain(ReservationAttachmentKind::DepositProof->value)
        ->and($kinds)->toContain(ReservationAttachmentKind::ContractPdf->value);
});

it('includes issued contract pdf on builder timeline attachments', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ContractDataPending,
    ]);

    ReservationAttachment::factory()->contractPdf()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
        'original_name' => 'contrato.pdf',
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('attachments.0.kind', ReservationAttachmentKind::ContractPdf->value)
        ->assertJsonPath('attachments.0.original_name', 'contrato.pdf');
});
