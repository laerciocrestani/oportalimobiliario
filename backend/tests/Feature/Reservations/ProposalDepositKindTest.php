<?php

/**
 * @see REQ-RDP-009
 */
use App\Enums\DepositKind;
use App\Enums\ReservationStatus;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

/**
 * @return array{tenant: Tenant, builder: User, broker: User, unit: Unit, reservation: Reservation}
 */
function depositKindReservation(DepositKind $kind, ReservationStatus $status = ReservationStatus::ProposalSigning): array
{
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    linkBrokerToTenant($broker, $tenant);
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => $status,
        'expires_at' => null,
    ]);
    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'deposit_kind' => $kind,
    ]);

    if ($status === ReservationStatus::ProposalSigning) {
        $document = SignatureDocument::query()->create([
            'tenant_id' => $tenant->id,
            'reservation_id' => $reservation->id,
            'kind' => SignatureDocumentKind::Proposal,
            'reference' => $tenant->id.':'.$reservation->id.':proposal',
            'provider_document_id' => 'doc-'.$reservation->id,
            'status' => SignatureDocumentStatus::Sent,
        ]);

        foreach ([
            [SignatureSignerRole::Buyer, 'sig-buyer-'.$reservation->id],
            [SignatureSignerRole::Builder, 'sig-builder-'.$reservation->id],
            [SignatureSignerRole::Broker, 'sig-broker-'.$reservation->id],
        ] as [$role, $token]) {
            SignatureSigner::query()->create([
                'tenant_id' => $tenant->id,
                'signature_document_id' => $document->id,
                'role' => $role,
                'name' => $role->value,
                'phone' => '11999999999',
                'email' => $role->value.'@example.com',
                'status' => SignatureSignerStatus::Pending,
                'provider_signer_id' => $token,
                'sign_url' => 'https://zapsign.test/'.$role->value,
            ]);
        }
    }

    return compact('tenant', 'builder', 'broker', 'unit', 'reservation');
}

function signDepositKindProposal(Reservation $reservation): void
{
    config(['services.zapsign.webhook_token' => 'hook-secret']);

    foreach (['buyer', 'builder', 'broker'] as $role) {
        test()->postJson('/api/webhooks/zapsign', [
            'token' => 'doc-'.$reservation->id,
            'signer_who_signed' => [
                'token' => 'sig-'.$role.'-'.$reservation->id,
                'status' => 'signed',
            ],
        ], ['X-ZapSign-Token' => 'hook-secret'])->assertOk();
    }
}

it('stores the deposit kind chosen by the broker', function () {
    Storage::fake('local');

    ['broker' => $broker, 'reservation' => $reservation] = depositKindReservation(
        DepositKind::Pix,
        ReservationStatus::ProposalDraft,
    );

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", validProposalRequest([
        'deposit_kind' => 'asset',
    ]))
        ->assertCreated()
        ->assertJsonPath('proposal.deposit_kind', 'asset');

    expect($reservation->proposals()->latest('version')->first()?->deposit_kind)->toBe(DepositKind::Asset);
});

it('rejects a proposal without a deposit kind', function () {
    Storage::fake('local');

    ['broker' => $broker, 'reservation' => $reservation] = depositKindReservation(
        DepositKind::Pix,
        ReservationStatus::ProposalDraft,
    );
    $payload = validProposalRequest();
    unset($payload['deposit_kind']);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/proposal", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['deposit_kind']);
});

it('does not open pix when the builder only accepts the proposal', function (DepositKind $kind) {
    Storage::fake('local');
    Http::preventStrayRequests();
    Http::fake();

    ['builder' => $builder, 'unit' => $unit, 'reservation' => $reservation] = depositKindReservation(
        $kind,
        ReservationStatus::ProposalPending,
    );

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => 'accepted',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ProposalSigning->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalSigning);
})->with([
    'pix' => DepositKind::Pix,
    'asset' => DepositKind::Asset,
]);

it('keeps a pix proposal in documentation until the payment proof', function () {
    ['broker' => $broker, 'unit' => $unit, 'reservation' => $reservation] = depositKindReservation(DepositKind::Pix);

    signDepositKindProposal($reservation);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::DepositPending);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.status', ReservationStatus::DepositPending->value)
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.pending_action', 'submit_deposit_proof');
});

it('skips the pix proof when the signal is an asset already in the proposal', function () {
    ['broker' => $broker, 'unit' => $unit, 'reservation' => $reservation] = depositKindReservation(DepositKind::Asset);

    signDepositKindProposal($reservation);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractDataPending);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/reservations')
        ->assertOk()
        ->assertJsonPath('0.status', ReservationStatus::ContractDataPending->value)
        ->assertJsonPath('0.kanban_column', 'docs_deposit')
        ->assertJsonPath('0.pending_action', 'submit_contract_data');

    $steps = $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_data_pending')
        ->json('steps');

    expect(collect($steps)->firstWhere('key', 'deposit_window')['status'])->toBe('skipped')
        ->and(collect($steps)->firstWhere('key', 'deposit_proof')['status'])->toBe('skipped')
        ->and(collect($steps)->firstWhere('status', 'current')['key'])->toBe('contract_data');

    $this->post("/api/broker/reservations/{$reservation->id}/deposit-proof", [
        'file' => UploadedFile::fake()->create('comprovante.pdf', 20, 'application/pdf'),
    ])->assertUnprocessable();
});
