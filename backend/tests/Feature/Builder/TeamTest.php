<?php

/**
 * @see REQ-TEAM-003
 */
use App\Enums\UserActivityAction;
use App\Models\Tenant;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('lists team members for manager', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create(['email' => 'viewer@demo.com']);

    Sanctum::actingAs($manager);

    $this->getJson('/api/builder/team')
        ->assertOk()
        ->assertJsonCount(2);
});

it('includes contracts.manage in the permission catalog', function () {
    expect(BuilderPermissions::all())->toContain(BuilderPermissions::MANAGE_CONTRACTS)
        ->and(BuilderPermissions::labels()[BuilderPermissions::MANAGE_CONTRACTS])->toBe('Gerenciar contratos');
});

it('creates team member with custom permissions', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($manager);

    $this->postJson('/api/builder/team', [
        'name' => 'Novo Membro',
        'email' => 'novo@demo.com',
        'password' => 'password123',
        'permissions' => [BuilderPermissions::VIEW_BUILDINGS, BuilderPermissions::SEND_INVITES],
    ])
        ->assertCreated()
        ->assertJsonPath('email', 'novo@demo.com')
        ->assertJsonPath('permissions', [BuilderPermissions::VIEW_BUILDINGS, BuilderPermissions::SEND_INVITES]);

    assertUserActivity($manager, UserActivityAction::TeamMemberCreated, 'novo@demo.com');
});

it('updates team member permissions', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $member = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create(['email' => 'member@demo.com']);

    Sanctum::actingAs($manager);

    $this->patchJson("/api/builder/team/{$member->id}", [
        'permissions' => [BuilderPermissions::VIEW_BUILDINGS, BuilderPermissions::MANAGE_UNITS],
    ])
        ->assertOk()
        ->assertJsonPath('permissions', [BuilderPermissions::VIEW_BUILDINGS, BuilderPermissions::MANAGE_UNITS]);
});

it('forbids team management without permission', function () {
    $tenant = Tenant::factory()->create();
    $viewer = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($viewer);

    $this->getJson('/api/builder/team')->assertForbidden();
});

it('cannot remove the last team manager', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($manager);

    $this->deleteJson("/api/builder/team/{$manager->id}")->assertForbidden();
});

it('isolates team members by tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaManager = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $betaMember = User::factory()->builder()->withBuilderPermissions()->for($beta)->create();

    Sanctum::actingAs($alphaManager);

    $this->patchJson("/api/builder/team/{$betaMember->id}", [
        'name' => 'Hacked',
    ])->assertForbidden();
});
