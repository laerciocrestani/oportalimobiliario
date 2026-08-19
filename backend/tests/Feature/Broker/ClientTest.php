<?php

/**
 * @see REQ-BRK-CLI-001
 */
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
use App\Models\Tenant;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists broker clients for authenticated broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $otherBroker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);

    BrokerClient::factory()->for($broker, 'broker')->create(['name' => 'Ana Silva']);
    BrokerClient::factory()->for($otherBroker, 'broker')->create(['name' => 'Outro Cliente']);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/clients')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Ana Silva');
});

it('creates broker client with required fields', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/clients', [
        'name' => 'João Souza',
        'phone' => '(11) 99999-9999',
        'email' => 'joao@example.com',
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'João Souza')
        ->assertJsonPath('phone', '(11) 99999-9999')
        ->assertJsonPath('email', 'joao@example.com');

    expect(BrokerClient::query()->where('broker_id', $broker->id)->count())->toBe(1);
    assertUserActivity($broker, UserActivityAction::ClientCreated, 'João Souza');
});

it('rejects client creation without phone', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();

    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->postJson('/api/broker/clients', [
        'name' => 'João Souza',
    ])->assertUnprocessable();
});

it('denies client endpoints for non broker', function () {
    $builder = User::factory()->builder()->create();

    Sanctum::actingAs($builder);

    $this->getJson('/api/broker/clients')->assertForbidden();
});
