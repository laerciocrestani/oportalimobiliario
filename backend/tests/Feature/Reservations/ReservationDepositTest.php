<?php

/**
 * @see REQ-RTL-013
 * @see REQ-RTL-014
 * @see REQ-RTL-015
 * @see REQ-RTL-016
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

it('submits deposit proof from deposit pending reservation', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'status' => ReservationStatus::DepositPending,
        'expires_at' => now()->addHours(24),
    ]);

    Sanctum::actingAs($broker);

    $file = UploadedFile::fake()->create('comprovante.pdf', 100, 'application/pdf');

    $this->post("/api/broker/reservations/{$reservation->id}/deposit-proof", [
        'file' => $file,
    ])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::DepositProofPending->value)
        ->assertJsonPath('attachment.original_name', 'comprovante.pdf');

    expect($reservation->fresh()->status)->toBe(ReservationStatus::DepositProofPending);
    expect(ReservationAttachment::query()->count())->toBe(1);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::DepositProofSubmitted)->exists())->toBeTrue();
    assertUserActivity($broker, UserActivityAction::ReservationDepositProofSubmitted, 'comprovante.pdf');
});

it('rejects deposit proof upload when reservation is not deposit pending', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $file = UploadedFile::fake()->create('comprovante.pdf', 100, 'application/pdf');

    $this->post("/api/broker/reservations/{$reservation->id}/deposit-proof", [
        'file' => $file,
    ])->assertStatus(422);
});

it('approves deposit proof and moves to contract data pending', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->depositProofPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationAttachment::factory()->depositProof()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::DepositProofSubmitted,
        'actor_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/deposit-proof/approve")
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::ContractDataPending->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::ContractDataPending);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::DepositProofApproved)->exists())->toBeTrue();
    assertUserActivity($builder, UserActivityAction::ReservationDepositProofApproved, $unit->code);
});

it('marks overdue deposit windows without cancelling reservation', function () {
    $broker = User::factory()->broker()->create();

    $reservation = Reservation::factory()->expired()->create([
        'broker_id' => $broker->id,
        'status' => ReservationStatus::DepositPending,
    ]);

    $this->artisan('opim:check-deposit-windows')->assertSuccessful();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::DepositPending);
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::DepositOverdue)->exists())->toBeTrue();
});

it('does not auto-expire deposit pending reservations via expire command', function () {
    $broker = User::factory()->broker()->create();

    $reservation = Reservation::factory()->expired()->create([
        'broker_id' => $broker->id,
        'status' => ReservationStatus::DepositPending,
    ]);

    $this->artisan('opim:expire-reservations')->assertSuccessful();

    expect(Reservation::query()->find($reservation->id))->not->toBeNull();
});

it('returns current deposit proof on timeline', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);

    $reservation = Reservation::factory()->depositProofPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationAttachment::factory()->depositProof()->create([
        'reservation_id' => $reservation->id,
        'uploaded_by' => $broker->id,
        'original_name' => 'pix.pdf',
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('current_stage', 'deposit_proof_pending')
        ->assertJsonPath('current_deposit_proof.original_name', 'pix.pdf');
});
