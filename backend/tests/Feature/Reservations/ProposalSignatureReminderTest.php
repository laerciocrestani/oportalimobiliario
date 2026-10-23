<?php

/**
 * @see REQ-RDP-007
 */
use App\Enums\ReservationStatus;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Mail\SignatureLinkMail;
use App\Models\Reservation;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Services\ProposalSignatureService;
use App\Support\BusinessClock;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

afterEach(function () {
    Carbon::setTestNow();
});

function configureReminderChannels(): void
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
        'https://graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
    ]);
}

/**
 * @param  array<string, mixed>  $signer
 * @return array{reservation: Reservation, document: SignatureDocument, signer: SignatureSigner}
 */
function reminderDocument(array $signer = [], ReservationStatus $status = ReservationStatus::ProposalSigning, SignatureDocumentStatus $documentStatus = SignatureDocumentStatus::Sent, SignatureDocumentKind $kind = SignatureDocumentKind::Proposal): array
{
    $tenant = Tenant::factory()->create();
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'status' => $status,
        'expires_at' => null,
    ]);
    $suffix = $kind === SignatureDocumentKind::Contract ? 'contract' : 'proposal';
    $document = SignatureDocument::query()->create([
        'tenant_id' => $tenant->id,
        'reservation_id' => $reservation->id,
        'kind' => $kind,
        'reference' => $tenant->id.':'.$reservation->id.':'.$suffix,
        'provider_document_id' => 'doc-'.$reservation->id,
        'status' => $documentStatus,
    ]);
    $row = SignatureSigner::query()->create([
        'tenant_id' => $tenant->id,
        'signature_document_id' => $document->id,
        'role' => $signer['role'] ?? SignatureSignerRole::Buyer,
        'name' => $signer['name'] ?? 'Maria Silva',
        'phone' => $signer['phone'] ?? '11999999999',
        'email' => array_key_exists('email', $signer) ? $signer['email'] : 'maria@example.com',
        'status' => $signer['status'] ?? SignatureSignerStatus::Pending,
        'provider_signer_id' => $signer['provider_signer_id'] ?? 'sig-'.$reservation->id,
        'sign_url' => $signer['sign_url'] ?? 'https://zapsign.test/buyer',
        'last_notified_at' => $signer['last_notified_at'] ?? null,
    ]);

    return ['reservation' => $reservation, 'document' => $document, 'signer' => $row];
}

function reminderWhatsAppCalls(): int
{
    return Http::recorded(
        fn ($request): bool => str_contains($request->url(), 'graph.facebook.com'),
    )->count();
}

it('schedules the proposal signature reminder at 08:00 in Brasilia', function () {
    $event = collect(app(Schedule::class)->events())->first(
        fn ($event) => str_contains((string) $event->command, 'opim:remind-proposal-signatures'),
    );

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('0 8 * * *')
        ->and((string) $event->timezone)->toBe(BusinessClock::TIMEZONE)
        ->and($event->withoutOverlapping)->toBeTrue();
});

it('reminds a pending signer once per day in Brasilia', function () {
    configureReminderChannels();
    Carbon::setTestNow(Carbon::parse('2026-10-06 08:00:00', BusinessClock::TIMEZONE));
    reminderDocument([
        'last_notified_at' => Carbon::parse('2026-10-05 22:30:00', BusinessClock::TIMEZONE),
    ]);

    $this->artisan('opim:remind-proposal-signatures')
        ->assertSuccessful()
        ->expectsOutput('Reminded 1 signer(s).');

    Mail::assertSent(SignatureLinkMail::class, fn (SignatureLinkMail $mail): bool => $mail->hasTo('maria@example.com'));
    expect(reminderWhatsAppCalls())->toBe(1);

    $this->artisan('opim:remind-proposal-signatures')
        ->assertSuccessful()
        ->expectsOutput('Reminded 0 signer(s).');

    Mail::assertSentCount(1);
    expect(reminderWhatsAppCalls())->toBe(1);
});

it('skips signers already notified earlier the same Brasilia day', function () {
    configureReminderChannels();
    Carbon::setTestNow(Carbon::parse('2026-10-06 08:00:00', BusinessClock::TIMEZONE));
    reminderDocument([
        'last_notified_at' => Carbon::parse('2026-10-06 07:00:00', BusinessClock::TIMEZONE),
    ]);

    $this->artisan('opim:remind-proposal-signatures')
        ->assertSuccessful()
        ->expectsOutput('Reminded 0 signer(s).');

    Mail::assertNothingSent();
    expect(reminderWhatsAppCalls())->toBe(0);
});

it('reminds only pending signers of a proposal that is still waiting for signatures', function () {
    configureReminderChannels();
    Carbon::setTestNow(Carbon::parse('2026-10-06 08:00:00', BusinessClock::TIMEZONE));

    ['document' => $document] = reminderDocument();
    SignatureSigner::query()->create([
        'tenant_id' => $document->tenant_id,
        'signature_document_id' => $document->id,
        'role' => SignatureSignerRole::Builder,
        'name' => 'Já Assinou',
        'phone' => '11988887777',
        'email' => 'assinou@example.com',
        'status' => SignatureSignerStatus::Signed,
        'provider_signer_id' => 'sig-signed',
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
        'provider_signer_id' => 'sig-refused',
        'sign_url' => 'https://zapsign.test/broker',
    ]);
    reminderDocument([], ReservationStatus::DepositPending);
    reminderDocument([], ReservationStatus::ProposalSigning, SignatureDocumentStatus::Failed);

    $this->artisan('opim:remind-proposal-signatures')
        ->assertSuccessful()
        ->expectsOutput('Reminded 1 signer(s).');

    Mail::assertSentCount(1);
    expect(reminderWhatsAppCalls())->toBe(1);
});

it('still resends manually after the daily reminder', function () {
    configureReminderChannels();
    Carbon::setTestNow(Carbon::parse('2026-10-06 08:00:00', BusinessClock::TIMEZONE));
    ['reservation' => $reservation] = reminderDocument([
        'last_notified_at' => Carbon::parse('2026-10-05 08:00:00', BusinessClock::TIMEZONE),
    ]);

    $this->artisan('opim:remind-proposal-signatures')->assertSuccessful();

    expect(app(ProposalSignatureService::class)->resendPendingLinks($reservation->fresh()))->toBe(1);
    Mail::assertSentCount(2);
    expect(reminderWhatsAppCalls())->toBe(2);
});

it('reminds a pending contract signer and skips a contract that already left signing', function () {
    configureReminderChannels();
    Carbon::setTestNow(Carbon::parse('2026-10-06 08:00:00', BusinessClock::TIMEZONE));
    reminderDocument([], ReservationStatus::ContractSigning, SignatureDocumentStatus::Sent, SignatureDocumentKind::Contract);
    reminderDocument([], ReservationStatus::ContractIssued, SignatureDocumentStatus::Sent, SignatureDocumentKind::Contract);

    $this->artisan('opim:remind-proposal-signatures')
        ->assertSuccessful()
        ->expectsOutput('Reminded 1 signer(s).');

    Mail::assertSent(SignatureLinkMail::class, fn (SignatureLinkMail $mail): bool => $mail->documentLabel === 'contrato');
    Mail::assertSentCount(1);
    expect(reminderWhatsAppCalls())->toBe(1);
});
