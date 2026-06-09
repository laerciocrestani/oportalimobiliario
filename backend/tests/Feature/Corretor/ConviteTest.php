<?php

/**
 * @see REQ-CONV-001
 * @see REQ-CONV-002
 * @see REQ-CONV-004
 */
use App\Models\AcessoUnidade;
use App\Models\ConviteCorretor;
use App\Models\Tenant;
use App\Models\Unidade;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('creates convite as construtora', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->construtora()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/construtora/convites', ['email' => 'novo@corretor.com'])
        ->assertCreated()
        ->assertJsonPath('email', 'novo@corretor.com');
});

it('accepts convite as corretor', function () {
    $tenant = Tenant::factory()->create();
    $construtora = User::factory()->construtora()->for($tenant)->create();
    $corretor = User::factory()->corretor()->create(['email' => 'aceite@demo.com']);

    $convite = ConviteCorretor::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $construtora->id,
        'email' => 'aceite@demo.com',
    ]);

    Sanctum::actingAs($corretor);

    $this->postJson('/api/corretor/convites/accept', ['token' => $convite->token])
        ->assertOk()
        ->assertJsonPath('corretor_id', $corretor->id);
});

it('lists unidades by acesso for corretor', function () {
    $tenant = Tenant::factory()->create();
    $corretor = User::factory()->corretor()->create();
    $unidade = Unidade::factory()->for($tenant)->create(['codigo' => '777']);

    AcessoUnidade::factory()->create([
        'tenant_id' => $tenant->id,
        'corretor_id' => $corretor->id,
        'unidade_id' => $unidade->id,
    ]);

    Unidade::factory()->for($tenant)->create(['codigo' => '888']);

    Sanctum::actingAs($corretor);

    $this->getJson('/api/corretor/unidades')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.codigo', '777');
});

it('grants acesso from construtora', function () {
    $tenant = Tenant::factory()->create();
    $construtora = User::factory()->construtora()->for($tenant)->create();
    $corretor = User::factory()->corretor()->create();
    $unidade = Unidade::factory()->for($tenant)->create();

    Sanctum::actingAs($construtora);

    $this->postJson('/api/construtora/acessos', [
        'corretor_id' => $corretor->id,
        'unidade_id' => $unidade->id,
    ])->assertCreated();
});
