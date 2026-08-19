<?php

/**
 * @see REQ-ADM-001
 * @see REQ-ADM-003
 * @see REQ-LOG-003
 */
use App\Enums\UserActivityAction;
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
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->postJson('/api/admin/tenants', [
        'name' => 'Nova Construtora',
        'slug' => 'nova-construtora',
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Nova Construtora');

    $tenant = Tenant::query()->where('slug', 'nova-construtora')->first();

    $event = assertUserActivity($admin, UserActivityAction::TenantCreated, 'Nova Construtora', $tenant?->id);
    expect($event->tenant_id)->toBe($tenant?->id)
        ->and($event->message)->toContain('slug nova-construtora');
});

it('denies admin routes to non admin', function () {
    Sanctum::actingAs(User::factory()->builder()->create());

    $this->getJson('/api/admin/tenants')->assertForbidden();
});

it('deactivates tenant', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/admin/tenants/{$tenant->id}", ['active' => false])
        ->assertOk()
        ->assertJsonPath('active', false);

    $event = assertUserActivity($admin, UserActivityAction::TenantUpdated, $tenant->name, $tenant->id);
    expect($event->message)->toContain('inativa')
        ->and($event->old_values)->toMatchArray(['active' => true])
        ->and($event->new_values)->toMatchArray(['active' => false]);
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
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/admin/tenants/{$tenant->id}", [
        'name' => 'Atualizada',
        'slug' => 'atualizada',
    ])
        ->assertOk()
        ->assertJsonPath('name', 'Atualizada')
        ->assertJsonPath('slug', 'atualizada');

    $event = assertUserActivity($admin, UserActivityAction::TenantUpdated, 'Atualizada', $tenant->id);
    expect($event->message)->toContain('slug atualizada')
        ->and($event->old_values)->toMatchArray(['name' => 'Original', 'slug' => 'original'])
        ->and($event->new_values)->toMatchArray(['name' => 'Atualizada', 'slug' => 'atualizada']);
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
