<?php

/**
 * @see REQ-RDP-007
 * @see REQ-RDP-010
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
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

function configureContractLinkChannels(): void
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
 * @return array{tenant: Tenant, builder: User, broker: User, reservation: Reservation}
 */
function contractLinkReservation(): array
{
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['phone' => '11988887777']);
    linkBrokerToTenant($broker, $tenant);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::ContractSigning,
        'expires_at' => null,
    ]);
    $document = SignatureDocument::query()->create([
        'tenant_id' => $tenant->id,
        'reservation_id' => $reservation->id,
        'kind' => SignatureDocumentKind::Contract,
        'reference' => $tenant->id.':'.$reservation->id.':contract',
        'provider_document_id' => 'doc-'.$reservation->id,
        'status' => SignatureDocumentStatus::Sent,
    ]);
    SignatureSigner::query()->create([
        'tenant_id' => $tenant->id,
        'signature_document_id' => $document->id,
        'role' => SignatureSignerRole::Buyer,
        'signer_key' => 'buyer',
        'name' => 'Maria Silva',
        'phone' => '11999999999',
        'email' => 'maria@example.com',
        'status' => SignatureSignerStatus::Pending,
        'provider_signer_id' => 'sig-buyer',
        'sign_url' => 'https://zapsign.test/buyer',
    ]);

    return compact('tenant', 'builder', 'broker', 'reservation');
}

it('resends the contract link by whatsapp and email', function () {
    configureContractLinkChannels();
    ['builder' => $builder, 'broker' => $broker, 'reservation' => $reservation] = contractLinkReservation();

    Sanctum::actingAs($builder);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/signature-links")
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/signature-links")
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Mail::assertSent(SignatureLinkMail::class, fn (SignatureLinkMail $mail): bool => $mail->documentLabel === 'contrato'
        && $mail->hasTo('maria@example.com'));
    Mail::assertSentCount(2);
});

it('shows contract signature progress on the kanban card', function () {
    ['builder' => $builder] = contractLinkReservation();

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'contract')
        ->assertJsonPath('0.signature_progress.signed', 0)
        ->assertJsonPath('0.signature_progress.total', 4);
});

it('resends the contract link only to the chosen witness', function () {
    configureContractLinkChannels();
    ['builder' => $builder, 'reservation' => $reservation] = contractLinkReservation();
    $documentId = SignatureSigner::query()->where('signer_key', 'buyer')->value('signature_document_id');

    SignatureSigner::query()->create([
        'tenant_id' => $reservation->tenant_id,
        'signature_document_id' => $documentId,
        'role' => SignatureSignerRole::Witness,
        'signer_key' => 'witness-1',
        'name' => 'Paula Testemunha',
        'phone' => '11977776666',
        'email' => 'paula@example.com',
        'status' => SignatureSignerStatus::Pending,
        'provider_signer_id' => 'sig-witness-1',
        'sign_url' => 'https://zapsign.test/witness-1',
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/signature-links", [
        'signer_key' => 'witness-1',
    ])
        ->assertOk()
        ->assertJsonPath('notified', 1);

    Mail::assertSent(SignatureLinkMail::class, fn (SignatureLinkMail $mail): bool => $mail->hasTo('paula@example.com'));
    expect(SignatureSigner::query()->where('signer_key', 'buyer')->sole()->last_notified_at)->toBeNull();
});

it('rejects a contract resend when the reservation is not waiting for signatures', function () {
    configureContractLinkChannels();
    ['builder' => $builder, 'reservation' => $reservation] = contractLinkReservation();
    $reservation->update(['status' => ReservationStatus::ContractIssued]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/signature-links")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'O contrato não está aguardando assinatura.');

    Mail::assertNothingSent();
});

it('forbids another broker and a builder without permission from resending the contract link', function () {
    configureContractLinkChannels();
    ['tenant' => $tenant, 'reservation' => $reservation] = contractLinkReservation();
    $otherBroker = User::factory()->broker()->create();
    linkBrokerToTenant($otherBroker, $tenant);
    $staff = User::factory()->builder()->for($tenant)->create();

    Sanctum::actingAs($otherBroker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/signature-links")->assertForbidden();

    Sanctum::actingAs($staff);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/signature-links")->assertForbidden();
});
