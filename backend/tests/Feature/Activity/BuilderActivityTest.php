<?php

/**
 * @see REQ-LOG-007
 * @see REQ-LOG-009
 * @see REQ-LOG-010
 */
use App\Enums\UserActivityAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserActivityEvent;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

function builderActivityRange(): array
{
    return [
        'from' => now()->subDays(7)->toDateString(),
        'to' => now()->toDateString(),
    ];
}

it('lists the authenticated builder own activity', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();
    $teammate = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    UserActivityEvent::factory()->create([
        'actor_user_id' => $user->id,
        'tenant_id' => $tenant->id,
        'action' => UserActivityAction::AuthLogin,
        'message' => 'Entrou no sistema.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $teammate->id,
        'tenant_id' => $tenant->id,
        'action' => UserActivityAction::AuthLogin,
        'message' => 'Colega entrou.',
        'created_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/activity?'.http_build_query(builderActivityRange()))
        ->assertOk()
        ->assertJsonPath('data.0.message', 'Entrou no sistema.')
        ->assertJsonCount(1, 'data');
});

it('forbids reading another member log without audit.view', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();
    $teammate = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/activity?'.http_build_query([
        ...builderActivityRange(),
        'user_id' => $teammate->id,
    ]))->assertForbidden();
});

it('allows a manager with audit.view to read a teammate log', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
        BuilderPermissions::VIEW_AUDIT,
    ])->for($tenant)->create();
    $teammate = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    UserActivityEvent::factory()->create([
        'actor_user_id' => $teammate->id,
        'tenant_id' => $tenant->id,
        'message' => 'Alterou a unidade 101.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $manager->id,
        'tenant_id' => $tenant->id,
        'message' => 'Evento do gestor.',
        'created_at' => now(),
    ]);

    Sanctum::actingAs($manager);

    $this->getJson('/api/builder/activity?'.http_build_query([
        ...builderActivityRange(),
        'user_id' => $teammate->id,
    ]))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.message', 'Alterou a unidade 101.');
});

it('forbids reading a builder from another tenant even with audit.view', function () {
    $tenant = Tenant::factory()->create();
    $other = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_AUDIT,
    ])->for($tenant)->create();
    $foreign = User::factory()->builder()->withBuilderPermissions()->for($other)->create();

    Sanctum::actingAs($manager);

    $this->getJson('/api/builder/activity?'.http_build_query([
        ...builderActivityRange(),
        'user_id' => $foreign->id,
    ]))->assertForbidden();
});

it('forbids reading a broker log from the builder portal', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_AUDIT,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    Sanctum::actingAs($manager);

    $this->getJson('/api/builder/activity?'.http_build_query([
        ...builderActivityRange(),
        'user_id' => $broker->id,
    ]))->assertForbidden();
});

it('requires a date range', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/builder/activity')->assertUnprocessable();
});

it('requires authentication', function () {
    $this->getJson('/api/builder/activity?'.http_build_query(builderActivityRange()))
        ->assertUnauthorized();
});

it('lists team members for the activity picker when audit.view is granted', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_AUDIT,
    ])->for($tenant)->create(['name' => 'Gestor']);
    User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create(['name' => 'Colega']);
    User::factory()->broker()->create(['name' => 'Corretor']);

    Sanctum::actingAs($manager);

    $this->getJson('/api/builder/activity/members')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonFragment(['name' => 'Gestor'])
        ->assertJsonFragment(['name' => 'Colega']);
});

it('forbids activity members without audit.view', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/builder/activity/members')->assertForbidden();
});
