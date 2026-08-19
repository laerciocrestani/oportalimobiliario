<?php

/**
 * @see REQ-LOG-003
 */
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Models\UserActivityEvent;
use App\Services\PreReservationService;
use App\Services\UserActivityCatalog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('records client creation with contact PII', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/clients', [
        'name' => 'João Souza',
        'phone' => '(11) 99999-9999',
        'email' => 'joao@example.com',
    ])->assertCreated();

    $event = assertUserActivity($broker, UserActivityAction::ClientCreated, 'João Souza');

    expect($event->tenant_id)->toBeNull()
        ->and($event->resource_type)->toBe('client')
        ->and($event->message)->toContain('(11) 99999-9999')
        ->and($event->message)->toContain('joao@example.com');
});

it('records pre-hold creation from the timeline write point', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'A-101',
        'status' => UnitStatus::Available,
    ]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $reservationId = $this->postJson('/api/broker/reservations/pre-hold', ['unit_id' => $unit->id])
        ->assertCreated()
        ->json('id');

    $event = assertUserActivity($broker, UserActivityAction::ReservationPreHoldCreated, 'A-101', $reservationId);

    expect($event->tenant_id)->toBe($tenant->id);
});

it('records pre-hold cancel before the reservation is deleted', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'B-202',
        'status' => UnitStatus::PreReserved,
    ]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}/pre-hold")->assertNoContent();

    $event = assertUserActivity($broker, UserActivityAction::ReservationPreHoldCancelled, 'B-202', $reservation->id);

    expect($event->message)->toContain('#'.$reservation->id);
});

it('does not record activity when a job expires a pre-hold', function () {
    $tenant = Tenant::factory()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    Reservation::factory()->preHold()->expired()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
    ]);

    app(PreReservationService::class)->expireDuePreHolds();

    expect(UserActivityEvent::query()->count())->toBe(0);
});

it('records reservation creation and observations as a message', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create([
        'name' => 'Ana Lima',
        'phone' => '11988887777',
    ]);
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'C-303',
        'status' => UnitStatus::Available,
    ]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $reservationId = $this->postJson('/api/broker/reservations', [
        'unit_id' => $unit->id,
        'client_id' => $client->id,
        'observations' => 'Cliente prefere unidade de canto.',
    ])->assertCreated()->json('id');

    assertUserActivity($broker, UserActivityAction::ReservationCreated, 'Ana Lima', $reservationId);
    assertUserActivity($broker, UserActivityAction::ReservationMessageSent, 'Cliente prefere unidade de canto.', $reservationId);

    expect(UserActivityEvent::query()->where('action', UserActivityAction::ReservationPreHoldCreated)->count())->toBe(0);
});

it('records proposal submission with client PII', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'D-404',
        'status' => UnitStatus::PreReserved,
    ]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/proposal", validProposalPayload())
        ->assertCreated();

    $event = assertUserActivity($broker, UserActivityAction::ReservationProposalSubmitted, 'Maria Silva', $reservation->id);

    expect($event->message)->toContain('12345678901')
        ->and($event->message)->toContain('11999999999')
        ->and($event->message)->toContain('D-404');
});

it('records every reservation message, not only the first dialogue', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'E-505',
        'status' => UnitStatus::Reserved,
    ]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/messages", [
        'body' => 'Primeiro recado.',
    ])->assertCreated();

    $this->postJson("/api/broker/reservations/{$reservation->id}/messages", [
        'body' => 'Segundo recado.',
    ])->assertCreated();

    expect(UserActivityEvent::query()
        ->where('actor_user_id', $broker->id)
        ->where('action', UserActivityAction::ReservationMessageSent)
        ->count())->toBe(2);

    assertUserActivity($broker, UserActivityAction::ReservationMessageSent, 'Segundo recado.', $reservation->id);
});

it('records deposit proof metadata without storing the file', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'F-606',
        'status' => UnitStatus::Reserved,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/deposit-proof", [
        'file' => UploadedFile::fake()->create('comprovante.pdf', 100, 'application/pdf'),
    ])->assertCreated();

    $event = assertUserActivity($broker, UserActivityAction::ReservationDepositProofSubmitted, 'comprovante.pdf', $reservation->id);

    expect($event->message)->toContain('F-606');
});

it('records contract data with client document PII', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'G-707',
        'status' => UnitStatus::Reserved,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'client_name' => 'Maria Silva',
        'client_cpf' => '00000000000',
    ]);

    Sanctum::actingAs($broker);

    $this->post("/api/broker/reservations/{$reservation->id}/contract-data", [
        'client_email' => 'maria@example.com',
        'client_cpf' => '52998224725',
        'client_rg' => '12.345.678-9',
        'address' => 'Rua A, 100',
        'city' => 'São Paulo',
        'state' => 'SP',
        'zip' => '01000-000',
        'marital_status' => 'Solteiro(a)',
        'nationality' => 'brasileira',
        'files' => [
            UploadedFile::fake()->create('rg.jpg', 80, 'image/jpeg'),
            UploadedFile::fake()->create('cpf.pdf', 80, 'application/pdf'),
        ],
    ])->assertCreated();

    $event = assertUserActivity($broker, UserActivityAction::ReservationContractDataSubmitted, 'Maria Silva', $reservation->id);

    expect($event->message)->toContain('52998224725');
});

it('records GOV signature and signed contract upload as distinct phrases', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'H-808',
        'status' => UnitStatus::Reserved,
    ]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->contractIssued()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractIssued,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();

    assertUserActivity($broker, UserActivityAction::ReservationContractUploaded, 'assinatura GOV', $reservation->id);

    $this->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-assinado.pdf', 120, 'application/pdf'),
    ])->assertCreated();

    $events = UserActivityEvent::query()
        ->where('actor_user_id', $broker->id)
        ->where('action', UserActivityAction::ReservationContractUploaded)
        ->orderBy('id')
        ->get();

    expect($events)->toHaveCount(2)
        ->and($events[0]->message)->toContain('assinatura GOV')
        ->and($events[1]->message)->toContain('contrato-assinado.pdf');
});

it('records reservation cancellation with the reason', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => 'I-909',
        'status' => UnitStatus::Reserved,
    ]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->deleteJson("/api/broker/reservations/{$reservation->id}", [
        'reason' => 'Cliente desistiu da compra.',
    ])->assertNoContent();

    $event = assertUserActivity($broker, UserActivityAction::ReservationCancelled, 'I-909', $reservation->id);

    expect($event->message)->toContain('Cliente desistiu da compra.');
});

it('skips activity for dialogue and actor-less timeline types', function () {
    $broker = User::factory()->broker()->create();
    $reservation = Reservation::factory()->create(['broker_id' => $broker->id]);
    $catalog = app(UserActivityCatalog::class);

    $catalog->recordFromTimeline($reservation, ReservationTimelineEventType::Dialogue, $broker);
    $catalog->recordFromTimeline($reservation, ReservationTimelineEventType::Expired, $broker);
    $catalog->recordFromTimeline($reservation, ReservationTimelineEventType::DepositWindowOpened, $broker);

    expect(UserActivityEvent::query()->count())->toBe(0);
});
