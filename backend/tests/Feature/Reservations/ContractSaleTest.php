<?php

/**
 * @see REQ-RDP-010
 */

use App\Enums\ReservationStatus;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * @param  list<SignatureSignerStatus>  $statuses
 */
function contractSaleReservation(Tenant $tenant, array $statuses): Reservation
{
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'status' => UnitStatus::Reserved,
    ]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
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

    foreach ($statuses as $index => $status) {
        $role = match ($index) {
            0 => SignatureSignerRole::Buyer,
            1 => SignatureSignerRole::Builder,
            default => SignatureSignerRole::Witness,
        };

        SignatureSigner::query()->create([
            'tenant_id' => $tenant->id,
            'signature_document_id' => $document->id,
            'role' => $role,
            'signer_key' => $index === 2 ? 'witness-1' : $role->value,
            'name' => 'Signatário '.$index,
            'phone' => '1199999000'.$index,
            'email' => 'signer'.$index.'@example.com',
            'status' => $status,
            'provider_signer_id' => 'sig-'.$index,
            'sign_url' => 'https://zapsign.test/'.$index,
        ]);
    }

    return $reservation;
}

it('marks the unit sold when every contract signer has signed', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $reservation = contractSaleReservation($tenant, [
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate", [
        'note' => 'Assinaturas conferidas.',
    ])->assertOk()
        ->assertJsonPath('status', ReservationStatus::Sold->value)
        ->assertJsonPath('unit_status', UnitStatus::Sold->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Sold)
        ->and($reservation->unit->fresh()->status)->toBe(UnitStatus::Sold);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.kanban_column', 'sold');
});

it('keeps the unit reserved while a contract signer has not signed', function (SignatureSignerStatus $pending) {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $reservation = contractSaleReservation($tenant, [
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
        $pending,
    ]);

    Sanctum::actingAs($builder);

    $list = $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', null)
        ->json('0.allowed_kanban_moves');

    expect($list)->not->toContain('sold');

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'O contrato ainda não foi assinado por todos.');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractSigning)
        ->and($reservation->unit->fresh()->status)->toBe(UnitStatus::Reserved);
})->with([
    'pending' => SignatureSignerStatus::Pending,
    'refused' => SignatureSignerStatus::Refused,
]);

it('offers the sale only after the contract signatures are complete', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $reservation = contractSaleReservation($tenant, [
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonPath('0.pending_action', 'sold_validation')
        ->assertJsonPath('0.needs_sold_validation', true)
        ->assertJsonPath('0.allowed_kanban_moves', ['cancelled', 'sold']);

    $timeline = $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->json();

    $step = collect($timeline['steps'])->firstWhere('key', 'contract_validate');

    expect($step['status'])->toBe('current')
        ->and($step['actions'])->toContain('validate_contract');
});

it('forbids a builder without permission and hides the reservation from another tenant', function () {
    $tenant = Tenant::factory()->create();
    $staff = User::factory()->builder()->for($tenant)->create();
    $reservation = contractSaleReservation($tenant, [
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
        SignatureSignerStatus::Signed,
    ]);

    Sanctum::actingAs($staff);
    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate")->assertForbidden();

    $other = User::factory()->builder()->withBuilderPermissions()->for(Tenant::factory())->create();
    Sanctum::actingAs($other);
    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate")->assertNotFound();
});
