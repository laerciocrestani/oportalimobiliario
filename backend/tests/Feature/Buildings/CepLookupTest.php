<?php

/**
 * @see REQ-WIZ-002
 */
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

it('looks up address by cep for builder', function () {
    Http::preventStrayRequests();
    Http::fake([
        'viacep.com.br/*' => Http::response([
            'cep' => '01310-100',
            'logradouro' => 'Avenida Paulista',
            'complemento' => 'de 612 a 1000 - lado par',
            'bairro' => 'Bela Vista',
            'localidade' => 'São Paulo',
            'uf' => 'SP',
        ]),
    ]);

    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/builder/cep/01310100')
        ->assertOk()
        ->assertJsonPath('zip', '01310100')
        ->assertJsonPath('street', 'Avenida Paulista')
        ->assertJsonPath('neighborhood', 'Bela Vista')
        ->assertJsonPath('city', 'São Paulo')
        ->assertJsonPath('state', 'SP');
});

it('returns not found when viacep does not know the cep', function () {
    Http::preventStrayRequests();
    Http::fake([
        'viacep.com.br/*' => Http::response(['erro' => true]),
    ]);

    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/builder/cep/00000000')
        ->assertNotFound();
});

it('returns unavailable when viacep is down', function () {
    Http::preventStrayRequests();
    Http::fake([
        'viacep.com.br/*' => Http::failedConnection(),
    ]);

    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/builder/cep/01310100')
        ->assertStatus(503);
});

it('rejects invalid cep length', function () {
    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/builder/cep/123')
        ->assertUnprocessable();
});

it('denies cep lookup to non builder', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/builder/cep/01310100')->assertForbidden();
});

it('requires authentication for cep lookup', function () {
    $this->getJson('/api/builder/cep/01310100')->assertUnauthorized();
});
