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
    Sanctum::actingAs(User::factory()->builder()->create());

    $this->getJson('/api/admin/tenants')->assertForbidden();
});

it('deactivates tenant', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson("/api/admin/tenants/{$tenant->id}", ['active' => false])
        ->assertOk()
        ->assertJsonPath('active', false);
});

it('shows tenant with users count', function () {
    $tenant = Tenant::factory()->create();
    User::factory()->builder()->for($tenant)->count(2)->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson("/api/admin/tenants/{$tenant->id}")
        ->assertOk()
        ->assertJsonPath('id', $tenant->id)
        ->assertJsonPath('users_count', 2);
});

it('updates tenant name and slug', function () {
    $tenant = Tenant::factory()->create([
        'name' => 'Original',
        'slug' => 'original',
    ]);
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson("/api/admin/tenants/{$tenant->id}", [
        'name' => 'Atualizada',
        'slug' => 'atualizada',
    ])
        ->assertOk()
        ->assertJsonPath('name', 'Atualizada')
        ->assertJsonPath('slug', 'atualizada');
});

it('rejects duplicate slug on update', function () {
    Tenant::factory()->create(['slug' => 'taken']);
    $tenant = Tenant::factory()->create(['slug' => 'mine']);
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->putJson("/api/admin/tenants/{$tenant->id}", ['slug' => 'taken'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);
});

it('requires authentication for admin tenant routes', function () {
    $tenant = Tenant::factory()->create();

    $this->getJson('/api/admin/tenants')->assertUnauthorized();
    $this->getJson("/api/admin/tenants/{$tenant->id}")->assertUnauthorized();
});
