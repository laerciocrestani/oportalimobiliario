<?php

/**
 * @see REQ-PUB-011
 */

use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\Tenant;
use App\Models\Unit;

it('returns an empty builder catalog when nothing is published', function () {
    $this->getJson('/api/public/builders')
        ->assertSuccessful()
        ->assertExactJson([]);
});

it('lists active builders with published buildings and units for sale', function () {
    $alpha = Tenant::factory()->create([
        'name' => 'Construtora Alpha',
        'slug' => 'construtora-alpha',
    ]);
    $beta = Tenant::factory()->inactive()->create([
        'name' => 'Construtora Beta',
        'slug' => 'construtora-beta',
    ]);
    $draftOnly = Tenant::factory()->create([
        'name' => 'Somente Rascunho',
        'slug' => 'somente-rascunho',
    ]);

    $saoPaulo = Building::factory()->for($alpha)->published()->create([
        'name' => 'Residencial Aurora',
        'slug' => 'residencial-aurora',
        'city' => 'São Paulo',
        'state' => 'SP',
        'street' => 'Avenida Paulista',
        'number' => '1000',
        'neighborhood' => 'Bela Vista',
    ]);
    Building::factory()->for($alpha)->published()->create([
        'name' => 'Parque das Flores',
        'slug' => 'parque-das-flores',
        'city' => 'Curitiba',
        'state' => 'PR',
    ]);
    $draft = Building::factory()->for($alpha)->create([
        'name' => 'Horizonte',
        'slug' => 'horizonte',
        'published' => false,
        'city' => 'Campinas',
        'state' => 'SP',
    ]);

    Unit::factory()->for($alpha)->for($saoPaulo)->count(2)->create([
        'status' => UnitStatus::Available,
    ]);
    Unit::factory()->for($alpha)->for($saoPaulo)->sold()->create();
    Unit::factory()->for($alpha)->for($draft)->create([
        'status' => UnitStatus::Available,
    ]);

    Building::factory()->for($beta)->published()->create([
        'city' => 'Goiânia',
        'state' => 'GO',
    ]);
    Building::factory()->for($draftOnly)->create([
        'published' => false,
        'city' => 'Santos',
        'state' => 'SP',
    ]);

    $this->getJson('/api/public/builders')
        ->assertSuccessful()
        ->assertJsonCount(1)
        ->assertJsonPath('0.slug', 'construtora-alpha')
        ->assertJsonPath('0.name', 'Construtora Alpha')
        ->assertJsonPath('0.logo_url', null)
        ->assertJsonPath('0.buildings_count', 2)
        ->assertJsonPath('0.available_units_count', 2)
        ->assertJsonPath('0.address', 'Curitiba, PR e São Paulo, SP');
});

it('uses the shared street when every published building has the same address', function () {
    $tenant = Tenant::factory()->create([
        'name' => 'Construtora Beta',
        'slug' => 'construtora-beta',
    ]);

    Building::factory()->for($tenant)->published()->count(2)->create([
        'street' => 'Rua das Flores',
        'number' => '10',
        'neighborhood' => 'Centro',
        'city' => 'Santos',
        'state' => 'SP',
    ]);

    $this->getJson('/api/public/builders')
        ->assertSuccessful()
        ->assertJsonPath('0.address', 'Rua das Flores, 10, Centro — Santos, SP')
        ->assertJsonPath('0.buildings_count', 2);
});

it('shows a builder with only its published buildings', function () {
    $tenant = Tenant::factory()->create([
        'name' => 'Construtora Alpha',
        'slug' => 'construtora-alpha',
    ]);
    Building::factory()->for($tenant)->published()->create([
        'name' => 'Residencial Aurora',
        'slug' => 'residencial-aurora',
        'city' => 'São Paulo',
        'state' => 'SP',
    ]);
    Building::factory()->for($tenant)->create([
        'name' => 'Horizonte',
        'slug' => 'horizonte',
        'published' => false,
    ]);

    $response = $this->getJson('/api/public/builders/construtora-alpha')
        ->assertSuccessful()
        ->assertJsonPath('name', 'Construtora Alpha')
        ->assertJsonPath('buildings_count', 1)
        ->assertJsonCount(1, 'buildings')
        ->assertJsonPath('buildings.0.slug', 'residencial-aurora')
        ->assertJsonPath('buildings.0.name', 'Residencial Aurora');

    expect(collect($response->json('buildings'))->pluck('slug'))->not->toContain('horizonte');
});

it('returns 404 for unknown inactive or unpublished builders', function (string $slug) {
    Tenant::factory()->inactive()->create([
        'slug' => 'construtora-beta',
    ]);
    $draftOnly = Tenant::factory()->create([
        'slug' => 'somente-rascunho',
    ]);
    Building::factory()->for($draftOnly)->create(['published' => false]);
    Building::factory()->for(Tenant::factory()->create(['slug' => 'construtora-beta-ativa']))->published()->create();

    $this->getJson("/api/public/builders/{$slug}")
        ->assertNotFound();
})->with([
    'unknown' => 'nao-existe',
    'inactive' => 'construtora-beta',
    'draft only' => 'somente-rascunho',
]);
