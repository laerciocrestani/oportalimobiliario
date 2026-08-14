<?php

/**
 * @see REQ-TEAM-005
 */
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('allows viewing buildings with buildings.view', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();
    Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/buildings')->assertOk();
});

it('forbids creating buildings without buildings.manage', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/buildings', ['name' => 'Novo'])
        ->assertForbidden();
});

it('allows updating unit status with units.update_status only', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
        BuilderPermissions::UPDATE_UNIT_STATUS,
    ])->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'status' => UnitStatus::Available,
    ]);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}/units/{$unit->id}", [
        'status' => UnitStatus::Sold->value,
    ])->assertOk();
});

it('forbids deleting units without units.manage', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
        BuilderPermissions::UPDATE_UNIT_STATUS,
    ])->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/buildings/{$building->id}/units/{$unit->id}")
        ->assertForbidden();
});

it('forbids broker invites without invites.send', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', ['email' => 'broker@demo.com'])
        ->assertForbidden();
});

it('allows builder to cancel reservation with reservations.cancel', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/reservations/{$reservation->id}", [
        'reason' => 'Unidade será relançada.',
    ])->assertNoContent();

    expect($reservation->fresh()->status)->toBe(ReservationStatus::Cancelled);
    expect($unit->fresh()->status)->toBe(UnitStatus::Available);
    expect($reservation->timelineEvents()->where('type', ReservationTimelineEventType::Cancelled)->first())
        ->not->toBeNull()
        ->payload->toMatchArray(['reason' => 'Unidade será relançada.']);
});

it('returns permissions on me endpoint for builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
        BuilderPermissions::SEND_INVITES,
    ])->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('permissions', [
            BuilderPermissions::VIEW_BUILDINGS,
            BuilderPermissions::SEND_INVITES,
        ]);
});
