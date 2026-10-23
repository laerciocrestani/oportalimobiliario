<?php

/**
 * @see REQ-RTL-005
 * @see REQ-RTL-008
 * @see REQ-RTL-009
 * @see REQ-RTL-010
 * @see REQ-RTL-011
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationMessage;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('submits proposal from pre-hold', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest())
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ProposalPending->value)
        ->assertJsonPath('proposal.client_name', 'Maria Silva')
        ->assertJsonPath('proposal.attachments.0.kind', ReservationAttachmentKind::Proposal->value)
        ->assertJsonPath('proposal.attachments.0.original_name', 'proposta.pdf')
        ->assertJsonPath('expires_at', null);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect($reservation->fresh()->expires_at)->toBeNull();
    expect(ReservationProposal::query()->count())->toBe(1);
    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::Proposal)->count())->toBe(1);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalSubmitted)->exists())->toBeTrue();
    assertUserActivity($broker, UserActivityAction::ReservationProposalSubmitted, 'Maria Silva');
});

it('rejects a proposal without the buyer identity', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $pdf = UploadedFile::fake()->create('proposta.pdf', 80, 'application/pdf');
    $photo = UploadedFile::fake()->create('simulacao.jpg', 80, 'image/jpeg');

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", [
        'client_name' => 'Maria Silva',
        'client_phone' => '11999999999',
        'payment_terms' => 'Entrada de R$ 50.000 + 24x de R$ 5.000',
        'deposit_kind' => 'pix',
        'files' => [$pdf, $photo],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['party_kind', 'client_cpf', 'address', 'city', 'state', 'zip']);
});

it('stores a company buyer on the proposal', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'party_kind' => 'company',
        'client_name' => 'Aurora Empreendimentos Ltda',
        'client_cpf' => '11222333000181',
        'client_rg' => null,
        'marital_status' => null,
        'nationality' => null,
        'profession' => null,
    ]))
        ->assertCreated()
        ->assertJsonPath('proposal.party_kind', 'company')
        ->assertJsonPath('proposal.client_cpf', '11222333000181')
        ->assertJsonPath('proposal.profession', null);
});

it('stores reinforcements and dations as json on the proposal', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'commercial_terms' => [
            'reinforcements' => [
                ['amount' => '10.000,00', 'due_on' => '10/11/2026'],
                ['amount' => '', 'due_on' => ''],
                ['amount' => '5.000,00', 'due_on' => ''],
            ],
            'dations' => ['Apartamento na rua A', ''],
        ],
    ]))
        ->assertCreated()
        ->assertJsonPath('proposal.commercial_terms.reinforcements.0.amount', '10000.00')
        ->assertJsonPath('proposal.commercial_terms.reinforcements.0.due_on', '2026-11-10')
        ->assertJsonPath('proposal.commercial_terms.reinforcements.1.amount', '5000.00')
        ->assertJsonPath('proposal.commercial_terms.reinforcements.1.due_on', null)
        ->assertJsonPath('proposal.commercial_terms.dations.0', 'Apartamento na rua A');

    expect($reservation->proposals()->first()?->commercial_terms)->toBe([
        'reinforcements' => [
            ['amount' => '10000.00', 'due_on' => '2026-11-10'],
            ['amount' => '5000.00', 'due_on' => null],
        ],
        'dations' => ['Apartamento na rua A'],
    ]);
});

it('stores the payment description inside commercial terms', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $description = "Entrada de R$ 50.000, vencimento em 10/11/2026.\nTotal dos reforços: R$ 30.000.";

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'commercial_terms' => [
            'description' => $description,
            'reinforcements' => [],
            'dations' => [],
        ],
    ]))
        ->assertCreated()
        ->assertJsonPath('proposal.commercial_terms.description', $description);

    expect($reservation->proposals()->first()?->commercial_terms['description'])->toBe($description);
});

it('rejects a reinforcement with an invalid amount or date', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'commercial_terms' => [
            'reinforcements' => [
                ['amount' => 'abc', 'due_on' => '32/13/2026'],
            ],
            'dations' => [],
        ],
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'commercial_terms.reinforcements.0.amount',
            'commercial_terms.reinforcements.0.due_on',
        ]);
});

it('rejects proposal without attachments', function () {
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

    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal", [
        'client_name' => 'Maria Silva',
        'client_phone' => '11999999999',
        'payment_terms' => 'Entrada de R$ 50.000',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['files']);
});

it('accepts proposal without opening a deposit TTL', function () {
    Storage::fake('local');

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

    $this->patch("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
        'signed_file' => signedProposalPdf(),
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ProposalSigning->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect($reservation->fresh()->client_id)->not->toBeNull();
    expect($reservation->fresh()->expires_at)->toBeNull();
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::DepositWindowOpened)->exists())->toBeFalse();
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalAccepted)->exists())->toBeTrue();
    assertUserActivity($builder, UserActivityAction::ReservationProposalAccepted, $unit->code);
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
    expect(ReservationMessage::query()->where('reservation_id', $reservation->id)->sole()->body)
        ->toBe('Proposta recusada: Perfil fora da política.');

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
        'decision_note' => 'Perfil fora da política.',
    ])->assertOk();

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::PreHold->value);

    expect(Reservation::query()->count())->toBe(2);
});

it('refuses to return a proposal for revision', function () {
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
        ->assertUnprocessable()
        ->assertJsonPath('message', 'A proposta não é devolvida. O diálogo fica nas mensagens; a construtora aceita ou recusa.');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalPending)
        ->and($unit->fresh()->status)->toBe(UnitStatus::PreReserved)
        ->and(ReservationMessage::query()->where('reservation_id', $reservation->id)->count())->toBe(0);
});

it('requires a note to return or reject a proposal', function (string $decision) {
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
        'decision' => $decision,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['decision_note']);

    expect(ReservationMessage::query()->where('reservation_id', $reservation->id)->count())->toBe(0);
})->with([
    ProposalDecision::Rejected->value,
    ProposalDecision::Returned->value,
]);

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

    Storage::fake('local');

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
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

it('includes proposal attachments on builder timeline before decision', function () {
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

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'files' => [
            UploadedFile::fake()->create('proposta.pdf', 80, 'application/pdf'),
            UploadedFile::fake()->create('simulacao.jpg', 80, 'image/jpeg'),
        ],
    ]))->assertCreated();

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'proposal_pending')
        ->assertJsonPath('current_proposal.attachments.0.kind', ReservationAttachmentKind::Proposal->value)
        ->assertJsonPath('current_proposal.attachments.0.original_name', 'proposta.pdf')
        ->assertJsonPath('current_proposal.attachments.1.original_name', 'simulacao.jpg')
        ->assertJsonPath('attachments.0.kind', ReservationAttachmentKind::Proposal->value);
});
