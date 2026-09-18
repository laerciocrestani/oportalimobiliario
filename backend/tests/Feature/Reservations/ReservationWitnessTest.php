<?php

/**
 * @see REQ-RPF-013
 * @see REQ-RPF-014
 */
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\Reservation;
use App\Models\ReservationTimelineEvent;
use App\Models\ReservationWitness;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('requires two team witnesses when the builder uploads the signed contract', function () {
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

    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
    ])->assertUnprocessable();
});

it('rejects a witness from another tenant', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $otherTenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $localWitness = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();
    $foreignWitness = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($otherTenant)->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);

    Sanctum::actingAs($broker);
    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();
    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-comprador.pdf', 120, 'application/pdf'),
    ])->assertCreated();

    Sanctum::actingAs($builder);

    $this->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
        'witness_1_user_id' => $localWitness->id,
        'witness_2_user_id' => $foreignWitness->id,
    ])->assertUnprocessable();
});

it('follows sequential witness signatures and then allows the manager to mark sold', function () {
    [
        'builder' => $builder,
        'unit' => $unit,
        'witness1' => $witness1,
        'witness2' => $witness2,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    Sanctum::actingAs($witness2);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/2/sign")
        ->assertUnprocessable();

    Sanctum::actingAs($witness1);
    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('steps.11.key', 'contract_witness_1')
        ->assertJsonPath('steps.11.status', 'current')
        ->assertJsonPath('steps.11.actions', ['sign_as_witness']);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")
        ->assertOk();

    expect(ReservationWitness::query()->where('user_id', $witness1->id)->whereNotNull('signed_at')->exists())->toBeTrue();
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractWitness1Signed)->exists())->toBeTrue();
    assertUserActivity($witness1, UserActivityAction::ReservationContractWitnessSigned, 'testemunha 1');

    Sanctum::actingAs($witness1);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")
        ->assertUnprocessable();

    Sanctum::actingAs($witness2);
    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('steps.12.key', 'contract_witness_2')
        ->assertJsonPath('steps.12.status', 'current')
        ->assertJsonPath('steps.12.actions', ['sign_as_witness']);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/2/sign")
        ->assertOk();

    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractWitness2Signed)->exists())->toBeTrue();

    Sanctum::actingAs($builder);
    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('steps.13.key', 'contract_validate')
        ->assertJsonPath('steps.13.status', 'current')
        ->assertJsonPath('steps.13.actions', ['validate_contract']);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/validate", [
        'note' => 'Contrato conferido com testemunhas.',
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::Sold->value)
        ->assertJsonPath('unit_status', UnitStatus::Sold->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Sold);
    expect($unit->fresh()->status)->toBe(UnitStatus::Sold);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'sold')
        ->assertJsonPath('steps.14.key', 'sold')
        ->assertJsonPath('steps.14.status', 'current');
});

it('allows a witness without reservations.cancel to sign only the assigned reservation', function () {
    [
        'tenant' => $tenant,
        'broker' => $broker,
        'witness1' => $witness1,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    $otherUnit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $otherReservation = Reservation::factory()->contractBuilderSigned()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $otherUnit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($witness1);

    $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', $reservation->id);

    $this->postJson("/api/builder/reservations/{$otherReservation->id}/contract/witnesses/1/sign")
        ->assertForbidden();

    $this->deleteJson("/api/builder/reservations/{$reservation->id}", [
        'reason' => 'Tentativa sem permissão.',
    ])->assertForbidden();
});

it('forbids another team member from signing as the assigned witness', function () {
    [
        'tenant' => $tenant,
        'reservation' => $reservation,
    ] = witnessFlowSetup();

    $intruder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($intruder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")
        ->assertForbidden();
});

it('isolates witness signing across tenants', function () {
    [
        'reservation' => $reservation,
        'witness1' => $witness1,
    ] = witnessFlowSetup();

    $otherTenant = Tenant::factory()->create();
    $foreignManager = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($otherTenant)->create();

    Sanctum::actingAs($foreignManager);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")
        ->assertNotFound();

    Sanctum::actingAs($witness1);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/witnesses/1/sign")
        ->assertOk();
});

it('lists witness candidates from the same tenant team', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create(['name' => 'Gestor Alpha']);
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    [$witness1] = createWitnesses($tenant);

    $otherTenant = Tenant::factory()->create();
    User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($otherTenant)->create(['name' => 'Estrangeiro']);

    $reservation = Reservation::factory()->contractUploaded()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/contract/witness-candidates")
        ->assertOk()
        ->assertJsonFragment(['id' => $builder->id, 'name' => 'Gestor Alpha'])
        ->assertJsonFragment(['id' => $witness1->id, 'name' => 'Testemunha Um'])
        ->assertJsonMissing(['name' => 'Estrangeiro']);
});
