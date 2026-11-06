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
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Support\Carbon;
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
        ->assertJsonPath('steps.1.actions', ['open_dialogue'])
        ->assertJsonPath('garage_units', []);
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
        ->assertJsonPath('0.situation.previous.label', 'Proposta')
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

it('keeps cancelled timeline read-only with dialogue and attachments', function () {
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
        'status' => ReservationStatus::Cancelled,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ProposalSubmitted,
        'actor_id' => $broker->id,
    ]);
    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ProposalAccepted,
        'actor_id' => $builder->id,
    ]);
    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::DepositWindowOpened,
    ]);
    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::Cancelled,
        'actor_id' => $builder->id,
        'payload' => ['reason' => 'Cliente desistiu.'],
    ]);
    ReservationAttachment::factory()->create([
        'reservation_id' => $reservation->id,
        'kind' => ReservationAttachmentKind::DepositProof,
        'uploaded_by' => $broker->id,
        'original_name' => 'pix.pdf',
    ]);

    Sanctum::actingAs($builder);

    $response = $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'cancelled')
        ->assertJsonPath('attachments.0.original_name', 'pix.pdf');

    $current = collect($response->json('steps'))->firstWhere('status', 'failed');

    expect($current)->not->toBeNull()
        ->and($current['key'])->toBe('deposit_window')
        ->and($current['actions'])->toBe(['open_dialogue']);

    $mutating = collect($response->json('steps'))
        ->pluck('actions')
        ->flatten()
        ->reject(fn (string $action) => $action === 'open_dialogue');

    expect($mutating)->toBeEmpty();
});

it('exposes hold actions on a client pre-hold timeline without deposit proof', function () {
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

    linkBrokerToTenant($broker, $tenant);

    Sanctum::actingAs($broker);

    $brokerActions = $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->json('steps.1.actions');

    expect($brokerActions)->toContain('open_dialogue')
        ->and($brokerActions)->not->toContain('submit_deposit_proof');

    Sanctum::actingAs($builder);

    $builderActions = $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->json('steps.1.actions');

    expect($builderActions)->toContain('extend_hold')
        ->and($builderActions)->toContain('drop_hold');
});

it('includes linked garage spots on the timeline', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create(['name' => 'Condomínio Jardim Europa']);
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'status' => UnitStatus::PreReserved,
        'code' => '501',
        'price' => 530660,
    ]);
    $garage = Unit::factory()->for($tenant)->for($building)->create([
        'code' => 'S1-02',
        'price' => 48000,
        'status' => UnitStatus::PreReserved,
    ]);

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
    $reservation->garageUnits()->attach($garage->id, ['tenant_id' => $tenant->id]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::PreHoldCreated,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('unit.code', '501')
        ->assertJsonPath('unit.building_name', 'Condomínio Jardim Europa')
        ->assertJsonPath('unit.price', '530660.00')
        ->assertJsonPath('garage_units.0.code', 'S1-02')
        ->assertJsonPath('garage_units.0.price', '48000.00')
        ->assertJsonPath('garage_units.0.floor_kind', 'garage');
});

it('lists the signature process while the proposal is waiting for signatures', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create(['name' => 'Helena Vargas']);
    $broker = User::factory()->broker()->create(['name' => 'João Corretor']);
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ProposalSigning,
        'expires_at' => null,
    ]);
    $sentAt = now()->subHours(2);
    $document = SignatureDocument::query()->create([
        'tenant_id' => $tenant->id,
        'reservation_id' => $reservation->id,
        'kind' => SignatureDocumentKind::Proposal,
        'reference' => $tenant->id.':'.$reservation->id.':proposal',
        'provider_document_id' => 'doc-1',
        'status' => SignatureDocumentStatus::Sent,
    ]);
    $document->forceFill([
        'created_at' => $sentAt,
        'updated_at' => $sentAt,
    ])->save();

    foreach ([
        [SignatureSignerRole::Builder, 'Helena Vargas', SignatureSignerStatus::Pending],
        [SignatureSignerRole::Broker, 'João Corretor', SignatureSignerStatus::Pending],
        [SignatureSignerRole::Buyer, 'Laércio Crestani', SignatureSignerStatus::Pending],
    ] as [$role, $name, $status]) {
        SignatureSigner::query()->create([
            'tenant_id' => $tenant->id,
            'signature_document_id' => $document->id,
            'role' => $role,
            'name' => $name,
            'phone' => '11999999999',
            'status' => $status,
            'provider_signer_id' => $role->value,
        ]);
    }

    Sanctum::actingAs($builder);

    $response = $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'proposal_signing')
        ->assertJsonPath('signature_process.parties.0.role', 'builder')
        ->assertJsonPath('signature_process.parties.0.label', 'Gestor da construtora')
        ->assertJsonPath('signature_process.parties.0.name', 'Helena Vargas')
        ->assertJsonPath('signature_process.parties.0.status', 'pending')
        ->assertJsonPath('signature_process.parties.1.role', 'broker')
        ->assertJsonPath('signature_process.parties.1.status', 'pending')
        ->assertJsonPath('signature_process.parties.2.role', 'buyer')
        ->assertJsonPath('signature_process.parties.2.name', 'Laércio Crestani');

    $sent = Carbon::parse($response->json('signature_process.sent_at'));
    $due = Carbon::parse($response->json('signature_process.due_at'));

    expect($due->equalTo($sent->copy()->addHours(24)))->toBeTrue();
});

it('lists the contract signature process with both witnesses', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create(['name' => 'Helena Vargas']);
    $broker = User::factory()->broker()->create(['name' => 'João Corretor']);
    $unit = Unit::factory()->for($tenant)->create();
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ContractSigning,
        'expires_at' => null,
    ]);
    $document = SignatureDocument::query()->create([
        'tenant_id' => $tenant->id,
        'reservation_id' => $reservation->id,
        'kind' => SignatureDocumentKind::Contract,
        'reference' => $tenant->id.':'.$reservation->id.':contract',
        'provider_document_id' => 'doc-contract',
        'status' => SignatureDocumentStatus::Sent,
    ]);

    foreach ([
        ['buyer', SignatureSignerRole::Buyer, 'Laércio Crestani', SignatureSignerStatus::Signed],
        ['builder', SignatureSignerRole::Builder, 'Helena Vargas', SignatureSignerStatus::Pending],
        ['witness-1', SignatureSignerRole::Witness, 'João Corretor', SignatureSignerStatus::Pending],
        ['witness-2', SignatureSignerRole::Witness, 'Paula Testemunha', SignatureSignerStatus::Pending],
    ] as [$key, $role, $name, $status]) {
        SignatureSigner::query()->create([
            'tenant_id' => $tenant->id,
            'signature_document_id' => $document->id,
            'role' => $role,
            'signer_key' => $key,
            'name' => $name,
            'phone' => '11999999999',
            'status' => $status,
            'provider_signer_id' => $key,
            'signed_at' => $status === SignatureSignerStatus::Signed ? now() : null,
        ]);
    }

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_signing')
        ->assertJsonPath('signature_process.parties.0.key', 'buyer')
        ->assertJsonPath('signature_process.parties.0.label', 'Comprador')
        ->assertJsonPath('signature_process.parties.0.name', 'Laércio Crestani')
        ->assertJsonPath('signature_process.parties.0.status', 'signed')
        ->assertJsonPath('signature_process.parties.1.key', 'builder')
        ->assertJsonPath('signature_process.parties.1.name', 'Helena Vargas')
        ->assertJsonPath('signature_process.parties.2.key', 'witness-1')
        ->assertJsonPath('signature_process.parties.2.role', 'witness')
        ->assertJsonPath('signature_process.parties.2.label', 'Testemunha 1')
        ->assertJsonPath('signature_process.parties.2.name', 'João Corretor')
        ->assertJsonPath('signature_process.parties.3.key', 'witness-2')
        ->assertJsonPath('signature_process.parties.3.label', 'Testemunha 2')
        ->assertJsonPath('signature_process.parties.3.name', 'Paula Testemunha');
});
