<?php

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 */
use App\Models\Empreendimento;
use App\Models\Tenant;

it('lists only published empreendimentos without auth', function () {
    $tenant = Tenant::factory()->create();
    Empreendimento::factory()->for($tenant)->publicado()->create(['nome' => 'Publicado']);
    Empreendimento::factory()->for($tenant)->create(['nome' => 'Rascunho', 'publicado' => false]);

    $this->getJson('/api/public/empreendimentos')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.nome', 'Publicado');
});

it('shows published empreendimento detail', function () {
    $tenant = Tenant::factory()->create();
    $emp = Empreendimento::factory()->for($tenant)->publicado()->create();

    $this->getJson("/api/public/empreendimentos/{$emp->id}")
        ->assertOk()
        ->assertJsonPath('id', $emp->id);
});

it('returns 404 for unpublished empreendimento', function () {
    $tenant = Tenant::factory()->create();
    $emp = Empreendimento::factory()->for($tenant)->create(['publicado' => false]);

    $this->getJson("/api/public/empreendimentos/{$emp->id}")
        ->assertNotFound();
});
