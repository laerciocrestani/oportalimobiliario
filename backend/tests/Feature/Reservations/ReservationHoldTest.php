<?php

/**
 * @see REQ-RPF-004
 * @see REQ-RPF-006
 * @see REQ-RPF-007
 * @see REQ-RPF-009
 */
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
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

it('submits deposit proof from a client pre-hold and reserves the unit', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($broker);

    $file = UploadedFile::fake()->create('comprovante.pdf', 100, 'application/pdf');

    $this->post("/api/broker/reservations/{$reservation->id}/deposit-proof", [
        'file' => $file,
    ])
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::DepositProofPending->value);

    expect($reservation->fresh()->status)->toBe(ReservationStatus::DepositProofPending);
    expect($reservation->fresh()->expires_at)->toBeNull();
    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
    expect(ReservationAttachment::query()->count())->toBe(1);
});

it('extends the pre-reservation hold by the requested hours', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(5),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/hold/extend", [
        'hours' => 48,
    ])
        ->assertOk()
        ->assertJsonPath('status', ReservationStatus::PreHold->value);

    expect($reservation->fresh()->expires_at->greaterThan(now()->addHours(52)))->toBeTrue()
        ->and($reservation->fresh()->expires_at->lessThan(now()->addHours(54)))->toBeTrue();
    expect(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::HoldExtended)->exists())->toBeTrue();
    assertUserActivity($builder, UserActivityAction::ReservationHoldExtended, $unit->code);
});

it('drops a client pre-hold and frees the unit', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $client = BrokerClient::factory()->for($broker, 'broker')->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::PreReserved]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/hold/drop")
        ->assertNoContent();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
});

it('forbids extending hold without reservations.cancel', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([])->for($tenant)->create();
    $client = BrokerClient::factory()->create();
    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/hold/extend")
        ->assertForbidden();
});

it('rejects extending a pre-hold without a client', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/hold/extend")
        ->assertUnprocessable();
});

it('isolates hold extend across tenants', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenantA)->create();
    $client = BrokerClient::factory()->create();
    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenantB->id,
        'client_id' => $client->id,
        'expires_at' => now()->addHours(48),
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/hold/extend")
        ->assertNotFound();
});
