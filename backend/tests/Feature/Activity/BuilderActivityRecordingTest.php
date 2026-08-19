<?php

/**
 * @see REQ-LOG-003
 */
use App\Enums\ProposalDecision;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Mail\BrokerInviteMail;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

it('records building create, update, publish and delete', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $buildingId = $this->postJson('/api/builder/buildings', [
        'name' => 'Residencial Aurora',
    ])->assertCreated()->json('id');

    $building = Building::query()->findOrFail($buildingId);
    assertUserActivity($user, UserActivityAction::BuildingCreated, 'Residencial Aurora', $buildingId);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'street' => 'Rua Augusta',
        'city' => 'São Paulo',
    ])->assertOk();

    assertUserActivity($user, UserActivityAction::BuildingUpdated, 'Residencial Aurora', $building->id);

    Unit::factory()->for($tenant)->for($building)->create([
        'status' => UnitStatus::Available,
        'price' => 520000,
    ]);

    $this->patchJson("/api/builder/buildings/{$building->id}", [
        'published' => true,
    ])->assertOk();

    assertUserActivity($user, UserActivityAction::BuildingPublished, 'Residencial Aurora', $building->id);

    $this->deleteJson("/api/builder/buildings/{$building->id}")->assertNoContent();
    assertUserActivity($user, UserActivityAction::BuildingDeleted, 'Residencial Aurora', $building->id);
});

it('records tower and unit CRUD plus status change', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['name' => 'Aurora']);

    Sanctum::actingAs($user);

    $towerId = $this->postJson("/api/builder/buildings/{$building->id}/towers", [
        'name' => 'Torre B',
    ])->assertCreated()->json('id');

    assertUserActivity($user, UserActivityAction::TowerCreated, 'Torre B', $towerId);

    $this->patchJson("/api/builder/buildings/{$building->id}/towers/{$towerId}", [
        'name' => 'Torre Beta',
    ])->assertOk();

    assertUserActivity($user, UserActivityAction::TowerUpdated, 'Torre Beta', $towerId);

    $unitId = $this->postJson("/api/builder/buildings/{$building->id}/units", [
        'tower_id' => $towerId,
        'code' => '501',
        'price' => 500000,
    ])->assertCreated()->json('id');

    assertUserActivity($user, UserActivityAction::UnitCreated, '501', $unitId);

    $this->patchJson("/api/builder/buildings/{$building->id}/units/{$unitId}", [
        'price' => 510000,
    ])->assertOk();

    assertUserActivity($user, UserActivityAction::UnitUpdated, '501', $unitId);

    $this->patchJson("/api/builder/buildings/{$building->id}/units/{$unitId}", [
        'status' => UnitStatus::Unavailable->value,
    ])->assertOk();

    $event = assertUserActivity($user, UserActivityAction::UnitStatusChanged, 'disponível', $unitId);
    expect($event->message)->toContain('indisponível');

    $this->deleteJson("/api/builder/buildings/{$building->id}/units/{$unitId}")->assertNoContent();
    assertUserActivity($user, UserActivityAction::UnitDeleted, '501', $unitId);

    $this->deleteJson("/api/builder/buildings/{$building->id}/towers/{$towerId}")->assertNoContent();
    assertUserActivity($user, UserActivityAction::TowerDeleted, 'Torre Beta', $towerId);
});

it('records team member create, update and delete', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($manager);

    $memberId = $this->postJson('/api/builder/team', [
        'name' => 'Novo Membro',
        'email' => 'novo@demo.com',
        'password' => 'password123',
        'permissions' => [BuilderPermissions::VIEW_BUILDINGS],
    ])->assertCreated()->json('id');

    assertUserActivity($manager, UserActivityAction::TeamMemberCreated, 'novo@demo.com', $memberId);

    $this->patchJson("/api/builder/team/{$memberId}", [
        'permissions' => [BuilderPermissions::VIEW_BUILDINGS, BuilderPermissions::MANAGE_UNITS],
    ])->assertOk();

    assertUserActivity($manager, UserActivityAction::TeamMemberUpdated, 'Novo Membro', $memberId);

    $this->deleteJson("/api/builder/team/{$memberId}")->assertNoContent();
    assertUserActivity($manager, UserActivityAction::TeamMemberDeleted, 'novo@demo.com', $memberId);
});

it('records broker invite create and revoke', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $inviteId = $this->postJson('/api/builder/invites', [
        'name' => 'Novo Corretor',
        'channel' => 'email',
        'email' => 'novo@broker.com',
    ])->assertCreated()->json('id');

    assertUserActivity($user, UserActivityAction::BrokerInviteCreated, 'novo@broker.com', $inviteId);

    $this->postJson("/api/builder/invites/{$inviteId}/revoke")->assertOk();
    assertUserActivity($user, UserActivityAction::BrokerInviteRevoked, 'Novo Corretor', $inviteId);
});

it('records building access grant and revoke', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['name' => 'Corretor Silva']);
    $building = Building::factory()->for($tenant)->create(['name' => 'Aurora']);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/brokers/{$broker->id}/buildings", [
        'building_id' => $building->id,
    ])->assertCreated();

    $access = BuildingAccess::query()->first();
    $event = assertUserActivity($builder, UserActivityAction::BuildingAccessGranted, 'Aurora', $access->id);
    expect($event->message)->toContain('Corretor Silva');

    $this->deleteJson("/api/builder/brokers/{$broker->id}/buildings/{$building->id}")->assertNoContent();
    assertUserActivity($builder, UserActivityAction::BuildingAccessRevoked, 'Corretor Silva', $access->id);
});

it('records a single building update when replacing wizard structure', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'name' => 'Aurora',
        'published' => false,
        'wizard_step' => 1,
    ]);

    Sanctum::actingAs($user);

    $this->putJson("/api/builder/buildings/{$building->id}/structure", [
        'towers' => [
            ['name' => 'Torre A', 'floors_count' => 2],
        ],
    ])->assertOk();

    $event = assertUserActivity($user, UserActivityAction::BuildingUpdated, 'estrutura', $building->id);
    expect($event->message)->toContain('1 torre');
});

it('records builder reservation decisions and messages via the shared write path', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => '101',
        'status' => UnitStatus::PreReserved,
    ]);

    $reservation = Reservation::factory()->proposalPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/proposal/decision", [
        'decision' => ProposalDecision::Accepted->value,
    ])->assertOk();

    assertUserActivity($builder, UserActivityAction::ReservationProposalAccepted, '101', $reservation->id);

    $this->postJson("/api/builder/reservations/{$reservation->id}/messages", [
        'body' => 'Documentos recebidos.',
    ])->assertCreated();

    assertUserActivity($builder, UserActivityAction::ReservationMessageSent, 'Documentos recebidos.', $reservation->id);

    $this->deleteJson("/api/builder/reservations/{$reservation->id}", [
        'reason' => 'Cliente desistiu.',
    ])->assertNoContent();

    assertUserActivity($builder, UserActivityAction::ReservationCancelled, 'Cliente desistiu.', $reservation->id);
});
