<?php

/**
 * @see REQ-RTL-018
 */
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
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function validContractDataPayload(array $overrides = []): array
{
    return array_merge([
        'client_email' => 'maria@example.com',
        'client_cpf' => '52998224725',
        'client_rg' => '12.345.678-9',
        'address' => 'Rua A, 100',
        'city' => 'São Paulo',
        'state' => 'SP',
        'zip' => '01000-000',
        'marital_status' => 'Solteiro(a)',
        'nationality' => 'brasileira',
    ], $overrides);
}

it('submits remaining client data and documentation from contract data pending', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    $proposal = ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'client_name' => 'Maria Silva',
        'client_phone' => '11999999999',
        'client_email' => 'antiga@example.com',
        'client_cpf' => '00000000000',
        'address' => 'Rua antiga',
        'city' => 'Campinas',
        'state' => 'SP',
        'zip' => '13000-000',
        'marital_status' => 'solteira',
        'nationality' => 'brasileira',
    ]);

    Sanctum::actingAs($broker);

    $rg = UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg');
    $cpf = UploadedFile::fake()->create('cpf.pdf', 80, 'application/pdf');

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(),
        'files' => [$rg, $cpf],
    ])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ContractDataPending->value)
        ->assertJsonPath('attachments.0.kind', ReservationAttachmentKind::ContractDocumentation->value)
        ->assertJsonPath('attachments.0.original_name', 'rg.jpg')
        ->assertJsonPath('attachments.1.original_name', 'cpf.pdf');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractDataPending);
    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ContractDocumentation)->count())->toBe(2);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractDataSubmitted)->exists())->toBeTrue();
    assertUserActivity($broker, UserActivityAction::ReservationContractDataSubmitted, '52998224725');

    $proposal->refresh();
    expect($proposal->client_name)->toBe('Maria Silva');
    expect($proposal->client_phone)->toBe('11999999999');
    expect($proposal->client_email)->toBe('maria@example.com');
    expect($proposal->client_cpf)->toBe('52998224725');
    expect($proposal->client_rg)->toBe('12.345.678-9');
    expect($proposal->address)->toBe('Rua A, 100');
    expect($reservation->fresh()->client->email)->toBe('maria@example.com');
});

it('allows contract data without email', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'client_email' => 'antiga@example.com',
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(['client_email' => null]),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])->assertCreated();

    expect($reservation->fresh()->proposals()->latest('version')->first()?->client_email)->toBe('');
    expect($reservation->fresh()->client->email)->toBeNull();
});

it('requires spouse data when marital status is married', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(['marital_status' => 'Casado(a)']),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors([
            'spouse_name',
            'spouse_cpf',
            'spouse_rg',
            'spouse_nationality',
        ]);
});

it('stores spouse data when the client is married', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload([
            'marital_status' => 'Casado(a)',
            'spouse_name' => 'Pedro Silva',
            'spouse_phone' => '11988887777',
            'spouse_email' => 'pedro@example.com',
            'spouse_cpf' => '111.444.777-35',
            'spouse_rg' => '98.765.432-1',
            'spouse_nationality' => 'brasileira',
        ]),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])->assertCreated();

    $proposal = $reservation->fresh()->proposals()->latest('version')->first();

    expect($proposal?->spouse_name)->toBe('Pedro Silva');
    expect($proposal?->spouse_cpf)->toBe('11144477735');
    expect($proposal?->spouse_rg)->toBe('98.765.432-1');
    expect($proposal?->spouse_nationality)->toBe('brasileira');
});

it('prefills name and phone from existing client when omitted', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    $reservation->client->update([
        'name' => 'Ana Costa',
        'phone' => '11988887777',
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])->assertCreated();

    $event = ReservationTimelineEvent::query()
        ->where('type', ReservationTimelineEventType::ContractDataSubmitted)
        ->first();

    expect($event?->payload['client']['client_name'])->toBe('Ana Costa');
    expect($event?->payload['client']['client_phone'])->toBe('11988887777');
});

it('rejects contract data when reservation is not contract data pending', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->depositProofPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])->assertStatus(422);
});

it('forbids another broker from submitting contract data', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $owner = User::factory()->broker()->create();
    $other = User::factory()->broker()->create();

    linkBrokerToTenant($owner, $tenant);
    linkBrokerToTenant($other, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $owner->id,
    ]);

    Sanctum::actingAs($other);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])->assertForbidden();
});

it('rejects invalid client and spouse cpfs', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload([
            'client_cpf' => '12345678901',
            'marital_status' => 'Casado(a)',
            'spouse_name' => 'Pedro Silva',
            'spouse_cpf' => '00000000000',
            'spouse_rg' => '98.765.432-1',
            'spouse_nationality' => 'brasileira',
        ]),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['client_cpf', 'spouse_cpf']);
});

it('rejects contract data without remaining client fields or files', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors([
            'client_cpf',
            'client_rg',
            'address',
            'city',
            'state',
            'zip',
            'marital_status',
            'nationality',
            'files',
        ]);
});

it('rejects duplicate contract data submission', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractDataSubmitted,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        ...validContractDataPayload(),
        'files' => [UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg')],
    ])->assertStatus(422);
});

it('exposes submit contract data action on broker timeline', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $response = $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'contract_data_pending')
        ->assertJsonPath('client.name', $reservation->client->name)
        ->assertJsonPath('client.phone', $reservation->client->phone);

    $contractDataStep = collect($response->json('steps'))->firstWhere('key', 'contract_data');

    expect($contractDataStep['status'])->toBe('current')
        ->and($contractDataStep['actions'])->toBe(['submit_contract_data']);
});
