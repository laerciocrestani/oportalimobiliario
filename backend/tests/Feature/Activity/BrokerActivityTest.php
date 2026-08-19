<?php

/**
 * @see REQ-LOG-006
 * @see REQ-LOG-010
 */
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserActivityEvent;
use Laravel\Sanctum\Sanctum;

function brokerActivityRange(): array
{
    return [
        'from' => now()->subDays(7)->toDateString(),
        'to' => now()->toDateString(),
    ];
}

it('lists only the authenticated broker activity', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $other = User::factory()->broker()->create();

    UserActivityEvent::factory()->create([
        'actor_user_id' => $broker->id,
        'tenant_id' => $tenantA->id,
        'message' => 'Cadastrou cliente Alpha.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $broker->id,
        'tenant_id' => $tenantB->id,
        'message' => 'Cadastrou cliente Beta.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $other->id,
        'tenant_id' => $tenantA->id,
        'message' => 'Evento de outro corretor.',
        'created_at' => now(),
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/activity?'.http_build_query(brokerActivityRange()))
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('filters the broker log by tenant', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    UserActivityEvent::factory()->create([
        'actor_user_id' => $broker->id,
        'tenant_id' => $tenantA->id,
        'message' => 'Só Alpha.',
        'created_at' => now(),
    ]);
    UserActivityEvent::factory()->create([
        'actor_user_id' => $broker->id,
        'tenant_id' => $tenantB->id,
        'message' => 'Só Beta.',
        'created_at' => now(),
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/activity?'.http_build_query([
        ...brokerActivityRange(),
        'tenant_id' => $tenantA->id,
    ]))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.message', 'Só Alpha.');
});

it('forbids a broker from reading another user log', function () {
    $broker = User::factory()->broker()->create();
    $other = User::factory()->broker()->create();
    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/activity?'.http_build_query([
        ...brokerActivityRange(),
        'user_id' => $other->id,
    ]))->assertForbidden();
});

it('requires a date range for broker activity', function () {
    Sanctum::actingAs(User::factory()->broker()->create());

    $this->getJson('/api/broker/activity')->assertUnprocessable();
});

it('requires authentication for broker activity', function () {
    $this->getJson('/api/broker/activity?'.http_build_query(brokerActivityRange()))
        ->assertUnauthorized();
});
