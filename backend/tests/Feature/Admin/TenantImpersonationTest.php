<?php

/**
 * @see REQ-ADM-006
 * @see REQ-LOG-005
 */
use App\Enums\UserActivityAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserActivityEvent;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;

it('lists builder users for tenant as admin', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create([
        'name' => 'Builder One',
    ]);
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson("/api/admin/tenants/{$tenant->id}/users")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', $builder->id)
        ->assertJsonPath('0.email', $builder->email);
});

it('denies tenant users listing to non admin', function () {
    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson("/api/admin/tenants/{$tenant->id}/users")->assertForbidden();
});

it('creates impersonation redirect for valid builder user', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/admin/tenants/{$tenant->id}/impersonate", [
        'user_id' => $builder->id,
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('expires_in', 60)
        ->assertJsonStructure(['redirect_url']);

    $redirectUrl = $response->json('redirect_url');
    expect($redirectUrl)->toContain('/auth/impersonate?code=');

    parse_str(parse_url($redirectUrl, PHP_URL_QUERY), $query);
    expect(Cache::has('impersonate:'.$query['code']))->toBeTrue();
});

it('rejects impersonation for builder from another tenant', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $otherTenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($otherTenant)->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson("/api/admin/tenants/{$tenant->id}/impersonate", [
        'user_id' => $builder->id,
    ])->assertUnprocessable();
});

it('rejects impersonation for inactive tenant', function () {
    $tenant = Tenant::factory()->create(['active' => false]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson("/api/admin/tenants/{$tenant->id}/impersonate", [
        'user_id' => $builder->id,
    ])->assertUnprocessable();
});

it('denies impersonation to non admin', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->postJson("/api/admin/tenants/{$tenant->id}/impersonate", [
        'user_id' => $builder->id,
    ])->assertForbidden();
});

it('exchanges impersonation code for builder token', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $admin = User::factory()->admin()->create();
    $code = '550e8400-e29b-41d4-a716-446655440000';

    Cache::put("impersonate:{$code}", [
        'user_id' => $builder->id,
        'admin_id' => $admin->id,
        'tenant_id' => $tenant->id,
    ], 60);

    $this->postJson('/api/auth/impersonate/exchange', ['code' => $code])
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role', 'tenant_id']])
        ->assertJsonPath('user.id', $builder->id)
        ->assertJsonPath('user.role', 'builder');

    expect(Cache::has("impersonate:{$code}"))->toBeFalse();
});

it('rejects invalid impersonation code', function () {
    $this->postJson('/api/auth/impersonate/exchange', [
        'code' => '550e8400-e29b-41d4-a716-446655440099',
    ])->assertUnprocessable();
});

it('rejects reused impersonation code', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $admin = User::factory()->admin()->create();
    $code = '550e8400-e29b-41d4-a716-446655440001';

    Cache::put("impersonate:{$code}", [
        'user_id' => $builder->id,
        'admin_id' => $admin->id,
        'tenant_id' => $tenant->id,
    ], 60);

    $this->postJson('/api/auth/impersonate/exchange', ['code' => $code])->assertOk();
    $this->postJson('/api/auth/impersonate/exchange', ['code' => $code])->assertUnprocessable();
});

it('records impersonate start on admin and builder logs', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $admin = User::factory()->admin()->create();
    $code = '550e8400-e29b-41d4-a716-446655440002';

    Cache::put("impersonate:{$code}", [
        'user_id' => $builder->id,
        'admin_id' => $admin->id,
        'tenant_id' => $tenant->id,
    ], 60);

    $this->postJson('/api/auth/impersonate/exchange', ['code' => $code])->assertOk();

    $events = UserActivityEvent::query()
        ->where('action', UserActivityAction::ImpersonateStart)
        ->get();

    expect($events)->toHaveCount(2)
        ->and($events->firstWhere('actor_user_id', $builder->id)?->impersonator_user_id)->toBe($admin->id)
        ->and($events->firstWhere('actor_user_id', $admin->id)?->impersonated_user_id)->toBe($builder->id);
});

it('records impersonate stop on both logs when the impersonation token logs out', function () {
    $tenant = Tenant::factory()->create(['active' => true]);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $admin = User::factory()->admin()->create();
    $token = $builder->createToken('impersonate:'.$admin->id)->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/auth/logout')
        ->assertOk();

    $stopEvents = UserActivityEvent::query()
        ->where('action', UserActivityAction::ImpersonateStop)
        ->get();

    expect($stopEvents)->toHaveCount(2)
        ->and($stopEvents->firstWhere('actor_user_id', $builder->id)?->impersonator_user_id)->toBe($admin->id)
        ->and($stopEvents->firstWhere('actor_user_id', $admin->id)?->impersonated_user_id)->toBe($builder->id);
});
