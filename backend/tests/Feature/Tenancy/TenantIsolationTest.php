<?php

/**
 * @see REQ-TEN-005
 */
use App\Models\Tenant;
use App\Models\TenantNote;
use App\Models\User;

it('isolates construtora notes between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    $alphaUser = User::factory()->construtora()->for($alpha)->create();
    $betaUser = User::factory()->construtora()->for($beta)->create();

    TenantNote::factory()->for($alpha)->create(['title' => 'Alpha only']);
    TenantNote::factory()->for($beta)->create(['title' => 'Beta only']);

    $this->actingAs($alphaUser)
        ->getJson('/api/construtora/notes')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Alpha only');

    $this->actingAs($betaUser)
        ->getJson('/api/construtora/notes')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Beta only');
});

it('denies construtora routes without tenant context', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->getJson('/api/construtora/notes')
        ->assertForbidden();
});

it('allows corretor routes without tenant context', function () {
    $corretor = User::factory()->corretor()->create();

    $this->actingAs($corretor)
        ->getJson('/api/corretor/profile')
        ->assertOk()
        ->assertJsonPath('role', 'corretor');
});

it('denies corretor routes when tenant context would be set', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->construtora()->for($tenant)->create();

    $this->actingAs($user)
        ->getJson('/api/corretor/profile')
        ->assertForbidden();
});
