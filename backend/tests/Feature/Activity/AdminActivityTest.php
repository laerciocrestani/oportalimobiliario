<?php

/**
 * @see REQ-LOG-008
 */
use App\Enums\UserActivityAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserActivityEvent;
use Laravel\Sanctum\Sanctum;

function adminActivityRange(): array
{
    return [
        'from' => now()->subDays(7)->toDateString(),
        'to' => now()->toDateString(),
    ];
}

it('lists activity across tenants for admin', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    UserActivityEvent::factory()->create([
        'actor_user_id' => $builder->id,
        'tenant_id' => $tenant->id,
        'action' => UserActivityAction::AuthLogin,
        'message' => 'Builder entrou.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $broker->id,
        'tenant_id' => $tenant->id,
        'action' => UserActivityAction::ClientCreated,
        'message' => 'Corretor cadastrou cliente.',
        'created_at' => now(),
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/activity?'.http_build_query(adminActivityRange()))
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('filters admin activity by user action and tenant', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenantA)->create();

    UserActivityEvent::factory()->create([
        'actor_user_id' => $user->id,
        'tenant_id' => $tenantA->id,
        'action' => UserActivityAction::AuthLogin,
        'message' => 'Match.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $user->id,
        'tenant_id' => $tenantA->id,
        'action' => UserActivityAction::AuthLogout,
        'message' => 'Outra ação.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $user->id,
        'tenant_id' => $tenantB->id,
        'action' => UserActivityAction::AuthLogin,
        'message' => 'Outro tenant.',
        'created_at' => now(),
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/activity?'.http_build_query([
        ...adminActivityRange(),
        'user_id' => $user->id,
        'tenant_id' => $tenantA->id,
        'action' => UserActivityAction::AuthLogin->value,
    ]))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.message', 'Match.');
});

it('exports csv with persisted messages and no period cap', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create([
        'name' => 'Construtora Alpha',
        'email' => 'alpha-log@demo.com',
    ]);

    UserActivityEvent::factory()->create([
        'actor_user_id' => $user->id,
        'tenant_id' => $tenant->id,
        'action' => UserActivityAction::AuthLogin,
        'message' => 'Entrou no sistema.',
        'created_at' => now()->subYears(4),
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $response = $this->get('/api/admin/activity/export?'.http_build_query([
        'from' => now()->subYears(5)->toDateString(),
        'to' => now()->toDateString(),
    ]));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');

    $csv = $response->streamedContent();

    expect($csv)->toContain('Entrou no sistema.')
        ->and($csv)->toContain('Construtora Alpha')
        ->and($csv)->toContain('alpha-log@demo.com')
        ->and($csv)->toContain(UserActivityAction::AuthLogin->value);
});

it('requires a date range for admin activity', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/activity')->assertUnprocessable();
});

it('denies activity listing to non admin', function () {
    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/admin/activity?'.http_build_query(adminActivityRange()))
        ->assertForbidden();
});
