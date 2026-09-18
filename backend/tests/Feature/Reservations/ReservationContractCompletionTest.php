<?php

/**
 * @see REQ-RTL-020
 * @see REQ-RTL-021
 * @see REQ-RTL-022
 */
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('registers GOV signature for client and broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov", [
        'note' => 'Assinado no GOV em 19/08.',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ContractIssued->value);

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractSignedGov)->exists())->toBeTrue();
    assertUserActivity($broker, UserActivityAction::ReservationContractUploaded, 'assinatura GOV');

    $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_issued')
        ->assertJsonPath('steps.9.key', 'contract_upload')
        ->assertJsonPath('steps.9.status', 'current')
        ->assertJsonPath('steps.9.actions', ['upload_signed_contract']);
});

it('forbids another broker from registering GOV signature', function () {
    $tenant = Tenant::factory()->create();
    $owner = User::factory()->broker()->create();
    $other = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($other, $tenant);

    $reservation = createContractIssuedReservation($tenant, $owner, $unit);

    Sanctum::actingAs($other);

    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")
        ->assertForbidden();
});

it('rejects duplicate GOV registration', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertUnprocessable();
});

it('uploads buyer-signed contract after GOV registration', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();

    $file = UploadedFile::fake()->create('contrato-assinado.pdf', 120, 'application/pdf');

    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => $file,
    ])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ContractUploaded->value)
        ->assertJsonPath('attachment.original_name', 'contrato-assinado.pdf');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractUploaded);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect(ReservationAttachment::query()->count())->toBe(1);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractUploaded)->exists())->toBeTrue();
});

it('rejects signed upload before GOV registration', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);

    $file = UploadedFile::fake()->create('contrato-assinado.pdf', 120, 'application/pdf');

    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => $file,
    ])->assertUnprocessable();
});

it('uploads builder-signed contract after the buyer PDF', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);
    [$witness1, $witness2] = createWitnesses($tenant);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();
    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-comprador.pdf', 120, 'application/pdf'),
    ])->assertCreated();

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_uploaded')
        ->assertJsonPath('steps.10.key', 'contract_builder_sign')
        ->assertJsonPath('steps.10.status', 'current')
        ->assertJsonPath('steps.10.actions', ['upload_builder_signed_contract']);

    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
        'witness_1_user_id' => $witness1->id,
        'witness_2_user_id' => $witness2->id,
    ])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ContractBuilderSigned->value)
        ->assertJsonPath('attachment.original_name', 'contrato-construtora.pdf');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractBuilderSigned);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractBuilderSigned)->exists())->toBeTrue();

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_builder_signed')
        ->assertJsonPath('steps.11.key', 'contract_witness_1')
        ->assertJsonPath('steps.11.status', 'current')
        ->assertJsonPath('steps.11.actions', []);
});

it('rejects builder-signed upload before the buyer PDF', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($builder);

    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
    ])->assertUnprocessable();
});

it('rejects duplicate builder-signed upload', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);
    [$witness1, $witness2] = createWitnesses($tenant);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();
    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-comprador.pdf', 120, 'application/pdf'),
    ])->assertCreated();

    Sanctum::actingAs($builder);
    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
        'witness_1_user_id' => $witness1->id,
        'witness_2_user_id' => $witness2->id,
    ])->assertCreated();
    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora-2.pdf', 120, 'application/pdf'),
        'witness_1_user_id' => $witness1->id,
        'witness_2_user_id' => $witness2->id,
    ])->assertUnprocessable();
});

it('rejects validating the sale before the builder-signed PDF', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();
    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-comprador.pdf', 120, 'application/pdf'),
    ])->assertCreated();

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate")
        ->assertUnprocessable();
});

it('rejects confirming the sale before witness signatures', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);
    [$witness1, $witness2] = createWitnesses($tenant);

    uploadBuyerAndBuilderContracts($reservation, $broker, $builder, $witness1, $witness2);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate", [
        'note' => 'Documentos conferidos.',
    ])->assertUnprocessable();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractBuilderSigned);
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
});

it('forbids builder without permission from validating contract', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->contractUploaded()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate")
        ->assertForbidden();
});

it('rejects validation from another tenant', function () {
    $tenant = Tenant::factory()->create();
    $otherTenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($otherTenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->contractUploaded()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate")
        ->assertNotFound();
});

it('forbids builder without permission from uploading builder-signed contract', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->contractUploaded()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
    ])->assertForbidden();
});

it('rejects cancelling a sold reservation', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Sold]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::Sold,
        'expires_at' => null,
    ]);

    Sanctum::actingAs($builder);

    $this->deleteJson("/api/builder/reservations/{$reservation->id}", [
        'reason' => 'Desistência tardia.',
    ])->assertUnprocessable();
});
