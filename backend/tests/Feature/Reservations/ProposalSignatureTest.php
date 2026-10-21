<?php

/**
 * @see REQ-RDP-006
 */
use App\Enums\ProposalDecision;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Models\TenantSignatureSetting;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function signatureReservation(): array
{
    $tenant = Tenant::factory()->create();
    $accepter = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create(['name' => 'Quem Aceitou']);
    $signer = User::factory()->builder()->for($tenant)->create([
        'name' => 'Signatário Oficial',
        'phone' => '11988887777',
    ]);
    $broker = User::factory()->broker()->create([
        'name' => 'Corretor da Venda',
        'phone' => '11977776666',
    ]);
    $unit = Unit::factory()->for($tenant)->create([
        'code' => '101',
        'status' => UnitStatus::PreReserved,
    ]);
    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'client_name' => 'Maria Silva',
        'client_phone' => '11999999999',
        'client_email' => 'maria@example.com',
    ]);
    TenantSignatureSetting::query()->create([
        'tenant_id' => $tenant->id,
        'proposal_signer_user_id' => $signer->id,
    ]);

    return compact('tenant', 'accepter', 'signer', 'broker', 'unit', 'reservation');
}

function fakeZapSign(int $status = 201): void
{
    config([
        'services.zapsign.base_url' => 'https://sandbox.zapsign.test',
        'services.zapsign.token' => 'test-token',
        'services.zapsign.webhook_token' => 'hook-secret',
    ]);

    Http::preventStrayRequests();
    Http::fake([
        'https://sandbox.zapsign.test/api/v1/docs/' => Http::response([
            'token' => 'doc-1',
            'signers' => [
                ['external_id' => 'buyer', 'token' => 'sig-buyer', 'sign_url' => 'https://zapsign.test/buyer'],
                ['external_id' => 'builder', 'token' => 'sig-builder', 'sign_url' => 'https://zapsign.test/builder'],
                ['external_id' => 'broker', 'token' => 'sig-broker', 'sign_url' => 'https://zapsign.test/broker'],
            ],
        ], $status),
    ]);
}

function signWebhook(string $signerToken, string $status = 'signed'): void
{
    test()->postJson('/api/webhooks/zapsign', [
        'token' => 'doc-1',
        'signer_who_signed' => [
            'token' => $signerToken,
            'status' => $status,
        ],
    ], ['X-ZapSign-Token' => 'hook-secret'])->assertOk();
}

it('keeps the acceptance when ZapSign fails', function () {
    Storage::fake('local');
    fakeZapSign(500);
    ['accepter' => $accepter, 'unit' => $unit, 'reservation' => $reservation] = signatureReservation();

    Sanctum::actingAs($accepter);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ProposalSigning->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    $document = SignatureDocument::query()->sole();
    expect($document->status)->toBe(SignatureDocumentStatus::Failed);
    expect($document->error)->toContain('HTTP 500');
});

it('keeps the acceptance when the proposal signer is not configured', function () {
    Storage::fake('local');
    Http::fake();
    ['accepter' => $accepter, 'unit' => $unit, 'reservation' => $reservation] = signatureReservation();
    TenantSignatureSetting::query()->delete();

    Sanctum::actingAs($accepter);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])->assertOk();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalSigning);
    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect(SignatureDocument::query()->sole()->error)->toContain('signatário');
    Http::assertNothingSent();
});

it('sends the configured signers and moves the card after the three signatures', function () {
    Storage::fake('local');
    fakeZapSign();
    ['accepter' => $accepter, 'unit' => $unit, 'reservation' => $reservation] = signatureReservation();

    Sanctum::actingAs($accepter);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])->assertOk();

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.status', ReservationStatus::ProposalSigning->value)
        ->assertJsonPath('0.kanban_column', 'proposal_formalization')
        ->assertJsonPath('0.situation.current.waiting_on', null);

    $document = SignatureDocument::query()->sole();
    expect($document->status)->toBe(SignatureDocumentStatus::Sent);
    expect($document->provider_document_id)->toBe('doc-1');
    expect($document->reference)->toBe($reservation->tenant_id.':'.$reservation->id.':proposal');

    expect(SignatureSigner::query()->where('role', SignatureSignerRole::Builder)->sole()->name)
        ->toBe('Signatário Oficial');
    expect(SignatureSigner::query()->where('role', SignatureSignerRole::Buyer)->sole()->name)->toBe('Maria Silva');
    expect(SignatureSigner::query()->where('role', SignatureSignerRole::Broker)->sole()->name)->toBe('Corretor da Venda');

    signWebhook('sig-buyer');
    signWebhook('sig-buyer');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalSigning);
    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
    expect(SignatureSigner::query()->where('status', SignatureSignerStatus::Signed)->count())->toBe(1);

    signWebhook('sig-builder');
    signWebhook('sig-broker');
    signWebhook('sig-broker');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::DepositPending);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ProposalSignedBoth)->count())->toBe(1);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'docs_deposit');
});

it('does not release the unit when one signer refuses', function () {
    Storage::fake('local');
    fakeZapSign();
    ['accepter' => $accepter, 'unit' => $unit, 'reservation' => $reservation] = signatureReservation();

    Sanctum::actingAs($accepter);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])->assertOk();

    signWebhook('sig-buyer', 'refused');

    expect(SignatureSigner::query()->where('role', SignatureSignerRole::Buyer)->sole()->status)
        ->toBe(SignatureSignerStatus::Refused);
    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalSigning);
    expect($unit->fresh()->status)->toBe(UnitStatus::PreReserved);
});

it('rejects a webhook without the platform token', function () {
    config(['services.zapsign.webhook_token' => 'hook-secret']);

    $this->postJson('/api/webhooks/zapsign', [
        'token' => 'doc-1',
        'signer_who_signed' => ['token' => 'sig-buyer', 'status' => 'signed'],
    ])->assertUnauthorized();
});
