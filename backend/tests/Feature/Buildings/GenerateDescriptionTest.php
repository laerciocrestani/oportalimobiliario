<?php

/**
 * @see REQ-WIZ-014
 */
use App\Models\Building;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

it('generates a description with gemini', function () {
    Http::preventStrayRequests();
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => 'Residencial Aurora em São Paulo, com duas torres.'],
                        ],
                    ],
                ],
            ],
        ]),
    ]);

    config([
        'opim.llm.provider' => 'gemini',
        'opim.llm.gemini_api_key' => 'test-key',
        'opim.llm.gemini_model' => 'gemini-2.0-flash',
    ]);

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create([
        'name' => 'Residencial Aurora',
        'city' => 'São Paulo',
        'state' => 'SP',
        'published' => false,
    ]);
    Tower::factory()->for($tenant)->for($building)->create([
        'name' => 'Torre A',
        'floors_count' => 8,
    ]);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertOk()
        ->assertJsonPath('description', 'Residencial Aurora em São Paulo, com duas torres.');

    expect($building->fresh()->description)->not->toBe('Residencial Aurora em São Paulo, com duas torres.');
});

it('generates a description with openai when configured', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.openai.com/*' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'content' => 'Empreendimento moderno no centro.',
                    ],
                ],
            ],
        ]),
    ]);

    config([
        'opim.llm.provider' => 'openai',
        'opim.llm.openai_api_key' => 'test-key',
        'opim.llm.openai_model' => 'gpt-4o-mini',
    ]);

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertOk()
        ->assertJsonPath('description', 'Empreendimento moderno no centro.');
});

it('returns unprocessable when the llm key is missing', function () {
    Http::preventStrayRequests();
    Http::fake();

    config([
        'opim.llm.provider' => 'gemini',
        'opim.llm.gemini_api_key' => '',
    ]);

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['description']);

    Http::assertNothingSent();
});

it('returns unprocessable when the llm provider is down', function () {
    Http::preventStrayRequests();
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::failedConnection(),
    ]);

    config([
        'opim.llm.provider' => 'gemini',
        'opim.llm.gemini_api_key' => 'test-key',
    ]);

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create(['published' => false]);

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['description']);
});

it('requires authentication to generate a description', function () {
    $building = Building::factory()->create();

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertUnauthorized();
});

it('denies description generation to non builder', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertForbidden();
});

it('isolates description generation between tenants', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $building = Building::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->postJson("/api/builder/buildings/{$building->id}/generate-description")
        ->assertNotFound();
});
