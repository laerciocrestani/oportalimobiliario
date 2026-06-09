<?php

/**
 * @see REQ-TEN-005
 */
use App\Models\Tenant;
use App\Models\TenantNote;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('isolates construtora notes between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    $alphaUser = User::factory()->construtora()->for($alpha)->create();
    $betaUser = User::factory()->construtora()->for($beta)->create();

    TenantNote::factory()->for($alpha)->create(['title' => 'Alpha only']);
    TenantNote::factory()->for($beta)->create(['title' => 'Beta only']);

    Sanctum::actingAs($alphaUser);

    $this->getJson('/api/construtora/notes')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Alpha only');

    Sanctum::actingAs($betaUser);

    $this->getJson('/api/construtora/notes')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Beta only');
});

it('denies construtora routes without tenant context', function () {
    $admin = User::factory()->admin()->create();

    Sanctum::actingAs($admin);

    $this->getJson('/api/construtora/notes')
        ->assertForbidden();
});

it('allows corretor routes without tenant context', function () {
    $corretor = User::factory()->corretor()->create();

    Sanctum::actingAs($corretor);

    $this->getJson('/api/corretor/profile')
        ->assertOk()
        ->assertJsonPath('role', 'corretor');
});

it('denies corretor routes when tenant context would be set', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->construtora()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/corretor/profile')
        ->assertForbidden();
});
