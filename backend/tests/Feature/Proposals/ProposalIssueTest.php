<?php

/**
 * @see REQ-RPF-011
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\ProposalTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function createPendingProposalReservation(Tenant $tenant, User $broker): Reservation
{
    $unit = Unit::factory()->for($tenant)->create([
        'code' => '101',
        'price' => 450000,
        'status' => UnitStatus::PreReserved,
    ]);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'client_name' => 'Maria Silva',
        'payment_terms' => 'Pix R$ 10.000 + 24x',
        'submitted_by' => $broker->id,
    ]);

    return $reservation;
}

it('issues a proposal pdf from an active template', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);
    $template = ProposalTemplate::factory()->for($tenant)->create([
        'name' => 'Proposta comercial',
        'body_markdown' => 'Cliente {{nome_cliente}} na unidade {{codigo_unidade}}.',
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/issue", [
        'proposal_template_id' => $template->id,
        'values' => ['nome_cliente' => 'Maria Silva'],
    ])
        ->assertCreated()
        ->assertJsonPath('attachment.kind', ReservationAttachmentKind::ProposalPdf->value);

    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ProposalPdf)->count())->toBe(1);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalPdfIssued)->exists())->toBeTrue();
    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalPending);
    assertUserActivity($builder, UserActivityAction::ReservationProposalPdfIssued, '101');
});

it('lists only active proposal templates of the tenant', function () {
    $tenant = Tenant::factory()->create();
    $other = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);

    ProposalTemplate::factory()->for($tenant)->create(['name' => 'Ativo']);
    ProposalTemplate::factory()->inactive()->for($tenant)->create(['name' => 'Inativo']);
    ProposalTemplate::factory()->for($other)->create(['name' => 'Outro tenant']);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/proposal/templates")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Ativo');
});

it('rejects issuing from an inactive template', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);
    $template = ProposalTemplate::factory()->inactive()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/issue", [
        'proposal_template_id' => $template->id,
        'values' => [],
    ])->assertUnprocessable();
});

it('isolates proposal issue templates by tenant', function () {
    Storage::fake('local');

    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($alpha, $broker);
    $betaTemplate = ProposalTemplate::factory()->for($beta)->create();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/issue", [
        'proposal_template_id' => $betaTemplate->id,
        'values' => [],
    ])->assertNotFound();
});

it('forbids issuing a proposal pdf without reservations.cancel', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::MANAGE_PROPOSALS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/proposal/templates")
        ->assertForbidden();
});

it('rejects accept without the builder-signed pdf', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['signed_file']);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalPending);
});

it('accepts a proposal only with the builder-signed pdf', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);
    $unit = $reservation->unit;

    Sanctum::actingAs($builder);

    $this->patch("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
        'signed_file' => signedProposalPdf(),
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::DepositPending->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect($reservation->fresh()->expires_at)->toBeNull();
    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ProposalSignedBuilder)->count())->toBe(1);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalAccepted)->exists())->toBeTrue();
    assertUserActivity($builder, UserActivityAction::ReservationProposalAccepted, '101');
});

it('rejects a non-pdf file on accept', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createPendingProposalReservation($tenant, $broker);

    Sanctum::actingAs($builder);

    $this->patch("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
        'signed_file' => UploadedFile::fake()->create('assinada.jpg', 80, 'image/jpeg'),
    ])->assertUnprocessable();
});
