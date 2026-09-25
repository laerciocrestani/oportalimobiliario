<?php

/**
 * @see REQ-RKP-001
 * @see REQ-RKP-002
 * @see REQ-RKP-003
 * @see REQ-RKP-005
 * @see REQ-RKP-006
 * @see REQ-RKP-007
 * @see REQ-RKP-008
 */
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('keeps formalization waiting on the broker until both parties signed the proposal', function () {
    ['builder' => $builder, 'reservation' => $reservation] = postProposalKanbanSetup();

    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.kanban_column', 'proposal_formalization')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('keeps docs and deposit waiting on the broker while the proof is missing', function () {
    ['builder' => $builder, 'reservation' => $reservation] = postProposalKanbanSetup();
    attachSignedProposalBoth($reservation, $builder);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('moves the ball to the builder while the deposit proof is under review', function () {
    ['builder' => $builder, 'broker' => $broker] = postProposalKanbanSetup(
        ReservationStatus::DepositProofPending,
    );

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');
});

it('returns the ball to the broker while contract data is pending', function () {
    ['builder' => $builder] = postProposalKanbanSetup(ReservationStatus::ContractDataPending);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('keeps issue-contract in docs_deposit waiting on the builder', function () {
    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = postProposalKanbanSetup(
        ReservationStatus::ContractDataPending,
    );

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractDataSubmitted,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');
});

it('waits on the broker to register GOV and then upload the buyer contract', function () {
    ['tenant' => $tenant, 'builder' => $builder, 'broker' => $broker, 'unit' => $unit] = postProposalKanbanSetup(
        ReservationStatus::ContractIssued,
        createReservation: false,
    );

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.kanban_column', 'contract')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'contract')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('waits on the builder after the buyer contract is uploaded', function () {
    ['builder' => $builder] = postProposalKanbanSetup(ReservationStatus::ContractUploaded);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'contract')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');
});

it('exposes witness as waiting_on and only the current witness gets the signature action', function () {
    [
        'builder' => $builder,
        'broker' => $broker,
        'witness1' => $witness1,
        'witness2' => $witness2,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness1);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.id', $reservation->id)
        ->assertJsonPath('0.kanban_column', 'contract')
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', 'witness_signature');

    Sanctum::actingAs($witness2);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', null);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', null);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', null);
});

it('keeps waiting_on witness after T1 signs and gives the action to T2', function () {
    [
        'builder' => $builder,
        'witness1' => $witness1,
        'witness2' => $witness2,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness1);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")->assertOk();

    Sanctum::actingAs($witness2);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', 'witness_signature');

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', null);
});

it('gives the witness view when the manager is also the current witness', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $witness2 = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);
    uploadBuyerAndBuilderContracts($reservation, $broker, $builder, $builder, $witness2);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.situation.current.waiting_on', 'witness')
        ->assertJsonPath('0.pending_action', 'witness_signature');
});

it('omits queue waiting_on on sold and cancelled cards', function () {
    ['builder' => $builder] = postProposalKanbanSetup(ReservationStatus::Sold);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'sold')
        ->assertJsonPath('0.situation.current.waiting_on', null);

    ['builder' => $builderCancelled] = postProposalKanbanSetup(ReservationStatus::Cancelled);
    Sanctum::actingAs($builderCancelled);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'cancelled')
        ->assertJsonPath('0.situation.current.waiting_on', null);
});

it('rejects deposit proof bundled with the signed proposal return', function () {
    Storage::fake('local');

    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = postProposalKanbanSetup();
    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $this->post("/api/broker/reservations/{$reservation->id}/proposal/signed", [
        'signed_file' => signedProposalPdf(),
        'deposit_proof' => UploadedFile::fake()->create('comprovante.pdf', 80, 'application/pdf'),
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['deposit_proof']);
});

it('rejects deposit proof before both parties signed the proposal', function () {
    Storage::fake('local');

    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = postProposalKanbanSetup();
    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $this->post("/api/broker/reservations/{$reservation->id}/deposit-proof", [
        'file' => UploadedFile::fake()->create('comprovante.pdf', 80, 'application/pdf'),
    ])->assertUnprocessable();
});

it('moves the card to docs_deposit after returning only the signed proposal', function () {
    Storage::fake('local');

    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = postProposalKanbanSetup();
    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $timeline = $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'deposit_pending')
        ->json();

    $depositStep = collect($timeline['steps'])->firstWhere('key', 'deposit_window');
    expect($depositStep['actions'])->toBe(['return_signed_proposal']);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal/signed", [
        'signed_file' => signedProposalPdf(),
    ])->assertOk();

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

it('exposes sequential pending actions from formalization through issue contract', function () {
    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = postProposalKanbanSetup();
    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'return_signed_proposal');

    attachSignedProposalBoth($reservation, $builder);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'submit_deposit_proof');

    $reservation->update(['status' => ReservationStatus::DepositProofPending]);

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'deposit_proof_approval');

    $reservation->update(['status' => ReservationStatus::ContractDataPending]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'submit_contract_data');

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractDataSubmitted,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.kanban_column', 'docs_deposit');

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'issue_contract')
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.situation.current.waiting_on', 'builder');
});

it('keeps overdue deposit waiting on the broker', function () {
    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = postProposalKanbanSetup();
    attachSignedProposalBoth($reservation, $builder);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::DepositOverdue,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);
    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.deposit_overdue', true)
        ->assertJsonPath('0.pending_action', 'submit_deposit_proof')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');

    Sanctum::actingAs($builder);
    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.deposit_overdue', true)
        ->assertJsonPath('0.pending_action', null)
        ->assertJsonPath('0.situation.current.waiting_on', 'broker');
});

/**
 * @return array{tenant: Tenant, builder: User, broker: User, reservation: Reservation|null, unit: Unit}
 */
function postProposalKanbanSetup(
    ReservationStatus $status = ReservationStatus::DepositPending,
    bool $createReservation = true,
): array {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = null;

    if ($createReservation) {
        $reservation = Reservation::factory()->create([
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'broker_id' => $broker->id,
            'client_id' => $client->id,
            'status' => $status,
            'expires_at' => in_array($status, [
                ReservationStatus::DepositPending,
                ReservationStatus::DepositProofPending,
                ReservationStatus::ContractDataPending,
            ], true) ? now()->addHours(48) : null,
        ]);
    }

    return compact('tenant', 'builder', 'broker', 'reservation', 'unit');
}

function attachSignedProposalBoth(Reservation $reservation, User $builder): void
{
    ReservationAttachment::factory()->proposalSignedBuilder()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $builder->id,
    ]);
    ReservationAttachment::factory()->proposalSignedBoth()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $reservation->broker_id,
    ]);
}
