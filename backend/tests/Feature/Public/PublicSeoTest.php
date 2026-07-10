<?php

/**
 * @see REQ-PUB-010
 */
use App\Models\Building;
use App\Models\Tenant;

it('returns sitemap xml with home and published buildings', function () {
    config(['app.public_site_url' => 'http://www.localhost:4321']);

    $tenant = Tenant::factory()->create();
    $published = Building::factory()->for($tenant)->published()->create([
        'slug' => 'residencial-aurora',
        'name' => 'Residencial Aurora',
    ]);
    Building::factory()->for($tenant)->create([
        'slug' => 'rascunho-interno',
        'published' => false,
    ]);

    $response = $this->get('/api/public/sitemap.xml')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

    expect($response->getContent())
        ->toContain('http://www.localhost:4321/')
        ->toContain("http://www.localhost:4321/empreendimentos/{$published->slug}")
        ->not->toContain('rascunho-interno');
});

it('returns robots txt pointing to sitemap', function () {
    config(['app.public_site_url' => 'http://www.localhost:4321']);

    $this->get('/api/public/robots.txt')
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('User-agent: *')
        ->assertSee('Sitemap: http://www.localhost:4321/sitemap.xml');
});
