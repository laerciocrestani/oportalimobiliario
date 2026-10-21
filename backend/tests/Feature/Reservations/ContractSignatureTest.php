<?php

/**
 * @see REQ-RDP-010
 */

use App\Enums\ReservationKanbanColumn;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureWitnessKind;
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Models\TenantSignatureSetting;
use App\Models\Unit;
use App\Models\User;
use App\Services\ContractSignatureService;
use App\Services\ReservationKanbanService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function contractSignatureReservation(Tenant $tenant, User $broker): Reservation
{
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '202',
        'status' => UnitStatus::Reserved,
    ]);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'client_name' => 'Maria Silva',
        'client_phone' => '11977776666',
        'client_email' => 'maria@example.com',
        'client_cpf' => '52998224725',
        'address' => 'Rua das Flores, 10',
        'submitted_by' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractDataSubmitted,
        'actor_id' => $broker->id,
    ]);

    return $reservation;
}

it('rejects contract issue when the client cpf or address is missing', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['phone' => '11988887777']);
    $reservation = contractSignatureReservation($tenant, $broker);
    $reservation->proposals()->update([
        'client_cpf' => '',
        'address' => '',
    ]);
    $template = ContractTemplate::factory()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 460000,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['client_cpf', 'address']);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractDataPending)
        ->and(SignatureDocument::query()->count())->toBe(0);
});

it('sends the contract to zapsign with the reservation broker as witness and keeps that copy', function () {
    Storage::fake('local');
    config([
        'services.zapsign.token' => 'zap-token',
        'services.zapsign.base_url' => 'https://sandbox.zapsign.com.br',
        'services.whatsapp.access_token' => '',
        'services.whatsapp.phone_number_id' => '',
    ]);
    Http::preventStrayRequests();
    Http::fake([
        'https://sandbox.zapsign.com.br/api/v1/docs/' => Http::response([
            'token' => 'doc-contract',
            'signers' => [
                ['external_id' => 'buyer', 'token' => 'sig-buyer', 'sign_url' => 'https://sign.example/buyer'],
                ['external_id' => 'builder', 'token' => 'sig-builder', 'sign_url' => 'https://sign.example/builder'],
                ['external_id' => 'witness-1', 'token' => 'sig-w1', 'sign_url' => 'https://sign.example/w1'],
                ['external_id' => 'witness-2', 'token' => 'sig-w2', 'sign_url' => 'https://sign.example/w2'],
            ],
        ]),
    ]);

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create([
        'name' => 'Signatário da Construtora',
        'phone' => '11911112222',
    ]);
    $witness = User::factory()->builder()->for($tenant)->create([
        'name' => 'Testemunha do Time',
        'phone' => '11933334444',
    ]);
    $replacement = User::factory()->builder()->for($tenant)->create([
        'name' => 'Outra Pessoa',
        'phone' => '11955556666',
    ]);
    $broker = User::factory()->broker()->create([
        'name' => 'Corretor da Venda',
        'phone' => '11988887777',
    ]);
    $reservation = contractSignatureReservation($tenant, $broker);
    $template = ContractTemplate::factory()->for($tenant)->create([
        'body_markdown' => 'Contrato de {{nome_cliente}}.',
    ]);

    $setting = TenantSignatureSetting::query()->create([
        'tenant_id' => $tenant->id,
        'proposal_signer_user_id' => $builder->id,
    ]);
    $setting->witnessSlots()->create([
        'tenant_id' => $tenant->id,
        'position' => 1,
        'kind' => SignatureWitnessKind::TeamUser,
        'user_id' => $witness->id,
    ]);
    $setting->witnessSlots()->create([
        'tenant_id' => $tenant->id,
        'position' => 2,
        'kind' => SignatureWitnessKind::SellingBroker,
        'user_id' => null,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 460000,
    ])->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ContractIssued->value);

    $reservation->refresh();

    expect($reservation->status)->toBe(ReservationStatus::ContractSigning)
        ->and(app(ReservationKanbanService::class)->column($reservation))->toBe(ReservationKanbanColumn::Contract)
        ->and(SignatureDocument::query()->sole()->kind)->toBe(SignatureDocumentKind::Contract)
        ->and(SignatureDocument::query()->sole()->status)->toBe(SignatureDocumentStatus::Sent)
        ->and(SignatureSigner::query()->where('signer_key', 'witness-2')->sole()->name)->toBe('Corretor da Venda')
        ->and(SignatureSigner::query()->where('signer_key', 'witness-1')->sole()->name)->toBe('Testemunha do Time')
        ->and(SignatureSigner::query()->where('signer_key', 'builder')->sole()->name)->toBe('Signatário da Construtora');

    Http::assertSent(function ($request): bool {
        $signers = $request->data()['signers'] ?? [];
        $witness = collect($signers)->firstWhere('external_id', 'witness-2');

        return ($witness['name'] ?? null) === 'Corretor da Venda';
    });

    $setting->update(['proposal_signer_user_id' => $replacement->id]);
    $setting->witnessSlots()->delete();
    $setting->witnessSlots()->create([
        'tenant_id' => $tenant->id,
        'position' => 1,
        'kind' => SignatureWitnessKind::TeamUser,
        'user_id' => $replacement->id,
    ]);

    app(ContractSignatureService::class)->send($reservation->id);

    Http::assertSentCount(1);
    expect(SignatureSigner::query()->where('signer_key', 'witness-2')->sole()->name)->toBe('Corretor da Venda')
        ->and(SignatureSigner::query()->where('signer_key', 'builder')->sole()->name)->toBe('Signatário da Construtora')
        ->and(SignatureSigner::query()->count())->toBe(4);
});
