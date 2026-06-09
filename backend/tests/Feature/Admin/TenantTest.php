<?php

/**
 * @see REQ-ADM-001
 * @see REQ-ADM-003
 */
use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists tenants for admin', function () {
    Tenant::factory()->count(2)->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/tenants')
        ->assertOk()
        ->assertJsonStructure(['data']);
});

it('creates tenant as admin', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/admin/tenants', [
        'name' => 'Nova Construtora',
        'slug' => 'nova-construtora',
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Nova Construtora');
});

it('denies admin routes to non admin', function () {
    Sanctum::actingAs(User::factory()->construtora()->create());

    $this->getJson('/api/admin/tenants')->assertForbidden();
});

it('deactivates tenant', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson("/api/admin/tenants/{$tenant->id}", ['active' => false])
        ->assertOk()
        ->assertJsonPath('active', false);
});
