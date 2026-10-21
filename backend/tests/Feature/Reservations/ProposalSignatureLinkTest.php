<?php

/**
 * @see REQ-RDP-007
 */
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\UnitStatus;
use App\Mail\SignatureLinkMail;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Models\TenantSignatureSetting;
use App\Models\Unit;
use App\Models\User;
use App\Services\ProposalSignatureService;
use App\Support\BuilderPermissions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function configureSignatureChannels(int $whatsappStatus = 200): void
{
    Mail::fake();
    config([
        'services.whatsapp.access_token' => 'wa-token',
        'services.whatsapp.phone_number_id' => '123',
        'services.whatsapp.api_version' => 'v21.0',
        'services.whatsapp.templates.signature_link' => 'signature_link',
        'services.whatsapp.template_language' => 'pt_BR',
    ]);
    Http::preventStrayRequests();
    Http::fake([
        'https://graph.facebook.com/*' => Http::response(
            $whatsappStatus === 200
                ? ['messages' => [['id' => 'wamid.1']]]
                : ['error' => ['message' => 'down']],
            $whatsappStatus,
        ),
    ]);
}

/**
 * @param  array{email?: ?string, status?: SignatureSignerStatus, role?: SignatureSignerRole, phone?: string, sign_url?: string}  $overrides
 */
function signatureLinkReservation(array $overrides = []): array
{
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create(['phone' => '11977776666']);
    linkBrokerToTenant($broker, $tenant);
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ProposalSigning,
        'expires_at' => null,
    ]);
    $document = SignatureDocument::query()->create([
        'tenant_id' => $tenant->id,
        'reservation_id' => $reservation->id,
        'kind' => SignatureDocumentKind::Proposal,
        'reference' => $tenant->id.':'.$reservation->id.':proposal',
        'provider_document_id' => 'doc-1',
        'status' => SignatureDocumentStatus::Sent,
    ]);
    $signer = SignatureSigner::query()->create([
        'tenant_id' => $tenant->id,
        'signature_document_id' => $document->id,
        'role' => $overrides['role'] ?? SignatureSignerRole::Buyer,
        'name' => 'Maria Silva',
        'phone' => $overrides['phone'] ?? '11999999999',
        'email' => array_key_exists('email', $overrides) ? $overrides['email'] : 'maria@example.com',
        'status' => $overrides['status'] ?? SignatureSignerStatus::Pending,
        'provider_signer_id' => 'sig-buyer',
        'sign_url' => $overrides['sign_url'] ?? 'https://zapsign.test/buyer',
    ]);

    return compact('tenant', 'builder', 'broker', 'reservation', 'document', 'signer');
}

function whatsAppCalls(): int
{
    return Http::recorded(
        fn ($request): bool => str_contains($request->url(), 'graph.facebook.com'),
    )->count();
}

it('sends whatsapp and email when the signer has an email', function () {
    configureSignatureChannels();
    ['builder' => $builder, 'reservation' => $reservation] = signatureLinkReservation();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/signature-links")
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Mail::assertSent(SignatureLinkMail::class, function (SignatureLinkMail $mail): bool {
        return $mail->hasTo('maria@example.com')
            && $mail->signUrl === 'https://zapsign.test/buyer'
            && $mail->recipientName === 'Maria Silva';
    });
    expect(whatsAppCalls())->toBe(1);
    Http::assertSent(fn ($request): bool => str_contains($request->url(), 'graph.facebook.com')
        && $request['to'] === '5511999999999'
        && $request['template']['name'] === 'signature_link'
        && collect($request['template']['components'][0]['parameters'])->contains(
            fn (array $parameter): bool => $parameter['text'] === 'https://zapsign.test/buyer',
        ));
    expect(SignatureSigner::query()->sole()->last_notified_at)->not->toBeNull();
});

it('sends only whatsapp when the signer has no email', function () {
    configureSignatureChannels();
    ['broker' => $broker, 'reservation' => $reservation] = signatureLinkReservation([
        'email' => null,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal/signature-links")
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Mail::assertNothingSent();
    expect(whatsAppCalls())->toBe(1);
});

it('resends only to signers who have not signed or refused', function () {
    configureSignatureChannels();
    ['builder' => $builder, 'reservation' => $reservation, 'document' => $document] = signatureLinkReservation();

    SignatureSigner::query()->create([
        'tenant_id' => $document->tenant_id,
        'signature_document_id' => $document->id,
        'role' => SignatureSignerRole::Builder,
        'name' => 'Já Assinou',
        'phone' => '11988887777',
        'email' => 'assinou@example.com',
        'status' => SignatureSignerStatus::Signed,
        'provider_signer_id' => 'sig-builder',
        'sign_url' => 'https://zapsign.test/builder',
    ]);
    SignatureSigner::query()->create([
        'tenant_id' => $document->tenant_id,
        'signature_document_id' => $document->id,
        'role' => SignatureSignerRole::Broker,
        'name' => 'Recusou',
        'phone' => '11977776666',
        'email' => 'recusou@example.com',
        'status' => SignatureSignerStatus::Refused,
        'provider_signer_id' => 'sig-broker',
        'sign_url' => 'https://zapsign.test/broker',
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/signature-links")
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Mail::assertSentCount(1);
    expect(whatsAppCalls())->toBe(1);
    expect(SignatureSigner::query()->where('status', SignatureSignerStatus::Signed)->sole()->last_notified_at)->toBeNull();
    expect(SignatureSigner::query()->where('status', SignatureSignerStatus::Refused)->sole()->last_notified_at)->toBeNull();
});

it('still emails when whatsapp fails and keeps the reservation in signing', function () {
    configureSignatureChannels(500);
    ['builder' => $builder, 'reservation' => $reservation] = signatureLinkReservation();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/signature-links")
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Mail::assertSentCount(1);
    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalSigning);
});

it('rejects resend when the proposal is not waiting for signatures', function () {
    configureSignatureChannels();
    ['builder' => $builder, 'reservation' => $reservation] = signatureLinkReservation();
    $reservation->update(['status' => ReservationStatus::DepositPending]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/signature-links")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'A proposta não está aguardando assinatura.');

    Mail::assertNothingSent();
    expect(whatsAppCalls())->toBe(0);
});

it('forbids another broker and a builder without permission from resending', function () {
    configureSignatureChannels();
    ['tenant' => $tenant, 'reservation' => $reservation] = signatureLinkReservation();
    $otherBroker = User::factory()->broker()->create();
    linkBrokerToTenant($otherBroker, $tenant);
    $staff = User::factory()->builder()->for($tenant)->create();

    Sanctum::actingAs($otherBroker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal/signature-links")->assertForbidden();

    Sanctum::actingAs($staff);
    $this->postJson("/api/builder/reservations/{$reservation->id}/proposal/signature-links")->assertForbidden();
});

it('requires authentication to resend the signature link', function () {
    $this->postJson('/api/builder/reservations/1/proposal/signature-links')->assertUnauthorized();
    $this->postJson('/api/broker/reservations/1/proposal/signature-links')->assertUnauthorized();
});

it('notifies every signer when the proposal is sent to ZapSign', function () {
    Storage::fake('local');
    configureSignatureChannels();
    config([
        'services.zapsign.base_url' => 'https://sandbox.zapsign.test',
        'services.zapsign.token' => 'test-token',
    ]);
    Http::fake([
        'https://sandbox.zapsign.test/api/v1/docs/' => Http::response([
            'token' => 'doc-1',
            'signers' => [
                ['external_id' => 'buyer', 'token' => 'sig-buyer', 'sign_url' => 'https://zapsign.test/buyer'],
                ['external_id' => 'builder', 'token' => 'sig-builder', 'sign_url' => 'https://zapsign.test/builder'],
                ['external_id' => 'broker', 'token' => 'sig-broker', 'sign_url' => 'https://zapsign.test/broker'],
            ],
        ], 201),
        'https://graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
    ]);

    $tenant = Tenant::factory()->create();
    $signer = User::factory()->builder()->for($tenant)->create([
        'name' => 'Signatário Oficial',
        'phone' => '11988887777',
        'email' => 'signatario@alpha.test',
    ]);
    $broker = User::factory()->broker()->create([
        'name' => 'Corretor da Venda',
        'phone' => '11977776666',
        'email' => 'corretor@alpha.test',
    ]);
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ProposalSigning,
        'expires_at' => null,
    ]);
    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'client_name' => 'Maria Silva',
        'client_phone' => '11999999999',
        'client_email' => '',
    ]);
    TenantSignatureSetting::query()->create([
        'tenant_id' => $tenant->id,
        'proposal_signer_user_id' => $signer->id,
    ]);
    Storage::disk('local')->put('reservations/proposta.pdf', '%PDF-1.1');
    ReservationAttachment::factory()->create([
        'reservation_id' => $reservation->id,
        'kind' => ReservationAttachmentKind::ProposalPdf,
        'path' => 'reservations/proposta.pdf',
        'uploaded_by' => $broker->id,
    ]);

    app(ProposalSignatureService::class)->send($reservation->id);

    Mail::assertSent(SignatureLinkMail::class, fn (SignatureLinkMail $mail): bool => $mail->hasTo('signatario@alpha.test'));
    Mail::assertSent(SignatureLinkMail::class, fn (SignatureLinkMail $mail): bool => $mail->hasTo('corretor@alpha.test'));
    Mail::assertSentCount(2);
    expect(whatsAppCalls())->toBe(3);
    expect($reservation->fresh()->status)->toBe(ReservationStatus::ProposalSigning);
});
