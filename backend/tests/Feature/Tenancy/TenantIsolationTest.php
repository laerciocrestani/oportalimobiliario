<?php

/**
 * @see REQ-TEN-005
 */
use App\Models\Tenant;
use App\Models\TenantNote;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('isolates builder notes between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    $alphaUser = User::factory()->builder()->for($alpha)->create();
    $betaUser = User::factory()->builder()->for($beta)->create();

    TenantNote::factory()->for($alpha)->create(['title' => 'Alpha only']);
    TenantNote::factory()->for($beta)->create(['title' => 'Beta only']);

    Sanctum::actingAs($alphaUser);

    $this->getJson('/api/builder/notes')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Alpha only');

    Sanctum::actingAs($betaUser);

    $this->getJson('/api/builder/notes')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Beta only');
});

it('denies builder routes without tenant context', function () {
    $admin = User::factory()->admin()->create();

    Sanctum::actingAs($admin);

    $this->getJson('/api/builder/notes')
        ->assertForbidden();
});

it('allows broker routes without tenant context', function () {
    $broker = User::factory()->broker()->create();

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/profile')
        ->assertOk()
        ->assertJsonPath('role', 'broker');
});

it('denies broker routes when tenant context would be set', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/broker/profile')
        ->assertForbidden();
});
