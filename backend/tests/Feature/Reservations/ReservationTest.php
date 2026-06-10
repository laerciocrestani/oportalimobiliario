<?php

/**
 * @see REQ-RES-001
 * @see REQ-RES-002
 * @see REQ-RES-004
 */
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Services\ReservationExpirationService;
use Laravel\Sanctum\Sanctum;

it('creates reservation for accessible unit', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Available]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', ['unit_id' => $unit->id])
        ->assertCreated()
        ->assertJsonPath('unit_id', $unit->id);

    expect($unit->fresh()->status)->toBe(UnitStatus::Reserved);
});

it('rejects reservation without access', function () {
    $unit = Unit::factory()->create(['status' => UnitStatus::Available]);
    $broker = User::factory()->broker()->create();

    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/reservations', ['unit_id' => $unit->id])
        ->assertForbidden();
});

it('expires reservations and frees unit', function () {
    $tenant = Tenant::factory()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'expires_at' => now()->subMinute(),
    ]);

    $count = app(ReservationExpirationService::class)->expireDueReservations();

    expect($count)->toBe(1);
    expect(Reservation::query()->count())->toBe(0);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
});

it('runs expire command', function () {
    $this->artisan('opim:expire-reservations')->assertSuccessful();
});
