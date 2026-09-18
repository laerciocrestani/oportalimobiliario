<?php

/**
 * @see REQ-RPF-012
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
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

function createAcceptedReservationForFormalization(Tenant $tenant, User $broker, User $builder): Reservation
{
    Storage::fake('local');

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

    test()->patch("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
        'signed_file' => signedProposalPdf('construtora.pdf'),
    ])->assertOk();

    return $reservation->fresh(['unit', 'attachments']);
}

it('returns the signed proposal without deposit proof', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createAcceptedReservationForFormalization($tenant, $broker, $builder);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal/signed", [
        'signed_file' => signedProposalPdf('ambas.pdf'),
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::DepositPending->value);

    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ProposalSignedBoth)->count())->toBe(1);
    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::DepositProof)->count())->toBe(0);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalSignedBoth)->exists())->toBeTrue();
    assertUserActivity($broker, UserActivityAction::ReservationProposalSignedBoth, $reservation->unit->code);
});

it('returns signed proposal and optional deposit proof in a single request', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createAcceptedReservationForFormalization($tenant, $broker, $builder);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal/signed", [
        'signed_file' => signedProposalPdf('ambas.pdf'),
        'deposit_proof' => UploadedFile::fake()->create('comprovante.pdf', 80, 'application/pdf'),
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::DepositProofPending->value);

    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ProposalSignedBoth)->count())->toBe(1);
    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::DepositProof)->count())->toBe(1);
    expect($reservation->unit->fresh()->status)->toBe(UnitStatus::Reserved);
});

it('rejects return without the signed pdf', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createAcceptedReservationForFormalization($tenant, $broker, $builder);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal/signed", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['signed_file']);
});

it('rejects return before the builder accepts with a signed pdf', function () {
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
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal/signed", [
        'signed_file' => signedProposalPdf(),
    ])->assertUnprocessable();
});

it('forbids another broker from returning the signed proposal', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $otherBroker = User::factory()->broker()->create();
    $reservation = createAcceptedReservationForFormalization($tenant, $broker, $builder);

    linkBrokerToTenant($otherBroker, $tenant);
    Sanctum::actingAs($otherBroker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal/signed", [
        'signed_file' => signedProposalPdf(),
    ])->assertForbidden();
});

it('exposes return_signed_proposal on the broker timeline after accept', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createAcceptedReservationForFormalization($tenant, $broker, $builder);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'deposit_pending')
        ->assertJsonFragment(['return_signed_proposal']);
});
