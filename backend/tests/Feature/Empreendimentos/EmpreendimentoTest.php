<?php

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-005
 */
use App\Models\Empreendimento;
use App\Models\Tenant;
use App\Models\Unidade;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lists empreendimentos scoped to tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    $alphaUser = User::factory()->construtora()->for($alpha)->create();
    Empreendimento::factory()->for($alpha)->create(['nome' => 'Alpha Emp']);
    Empreendimento::factory()->for($beta)->create(['nome' => 'Beta Emp']);

    Sanctum::actingAs($alphaUser);

    $this->getJson('/api/construtora/empreendimentos')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.nome', 'Alpha Emp');
});

it('creates empreendimento for construtora', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->construtora()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/construtora/empreendimentos', [
        'nome' => 'Novo Empreendimento',
        'publicado' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('nome', 'Novo Empreendimento')
        ->assertJsonPath('publicado', true);

    expect(Empreendimento::query()->count())->toBe(1);
});

it('manages unidades nested under empreendimento', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->construtora()->for($tenant)->create();
    $empreendimento = Empreendimento::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson("/api/construtora/empreendimentos/{$empreendimento->id}/unidades", [
        'codigo' => '501',
        'preco' => 500000,
    ])
        ->assertCreated()
        ->assertJsonPath('codigo', '501')
        ->assertJsonPath('status', 'disponivel');

    $this->getJson("/api/construtora/empreendimentos/{$empreendimento->id}/unidades")
        ->assertOk()
        ->assertJsonCount(1);
});

it('denies empreendimentos routes to non construtora', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/construtora/empreendimentos')->assertForbidden();
});

it('isolates empreendimentos between tenants on show', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->construtora()->for($alpha)->create();
    $empreendimento = Empreendimento::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->getJson("/api/construtora/empreendimentos/{$empreendimento->id}")
        ->assertNotFound();
});
