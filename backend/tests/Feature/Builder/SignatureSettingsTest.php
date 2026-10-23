<?php

/**
 * @see REQ-RDP-008
 */

use App\Enums\SignatureWitnessKind;
use App\Models\Tenant;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('saves a proposal signer and three witness slots for the tenant', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $ana = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create(['name' => 'Ana']);
    $bruno = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create(['name' => 'Bruno']);

    Sanctum::actingAs($manager);

    $payload = [
        'proposal_signer_user_id' => $ana->id,
        'witness_slots' => [
            ['kind' => SignatureWitnessKind::TeamUser->value, 'user_id' => $manager->id],
            ['kind' => SignatureWitnessKind::TeamUser->value, 'user_id' => $bruno->id],
            ['kind' => SignatureWitnessKind::SellingBroker->value],
        ],
    ];

    $this->putJson('/api/builder/signature-settings', $payload)
        ->assertOk()
        ->assertJsonPath('proposal_signer_user_id', $ana->id)
        ->assertJsonPath('witness_slots.0.kind', SignatureWitnessKind::TeamUser->value)
        ->assertJsonPath('witness_slots.0.user_id', $manager->id)
        ->assertJsonPath('witness_slots.1.user_id', $bruno->id)
        ->assertJsonPath('witness_slots.2.kind', SignatureWitnessKind::SellingBroker->value)
        ->assertJsonPath('witness_slots.2.user_id', null)
        ->assertJsonCount(3, 'witness_slots');

    $this->getJson('/api/builder/signature-settings')
        ->assertOk()
        ->assertJsonPath('proposal_signer_user_id', $ana->id)
        ->assertJsonCount(3, 'witness_slots');
});

it('isolates signature settings from another builder', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $managerA = User::factory()->builder()->withBuilderPermissions()->for($tenantA)->create();
    $signerA = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenantA)->create();
    $managerB = User::factory()->builder()->withBuilderPermissions()->for($tenantB)->create();

    Sanctum::actingAs($managerA);

    $this->putJson('/api/builder/signature-settings', [
        'proposal_signer_user_id' => $signerA->id,
        'witness_slots' => [
            ['kind' => SignatureWitnessKind::SellingBroker->value],
        ],
    ])->assertOk();

    Sanctum::actingAs($managerB);

    $this->getJson('/api/builder/signature-settings')
        ->assertOk()
        ->assertJsonPath('proposal_signer_user_id', null)
        ->assertJsonPath('witness_slots', []);

    $this->putJson('/api/builder/signature-settings', [
        'proposal_signer_user_id' => $signerA->id,
        'witness_slots' => [
            ['kind' => SignatureWitnessKind::TeamUser->value, 'user_id' => $signerA->id],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Escolha uma pessoa da sua equipe.');

    Sanctum::actingAs($managerA);

    $this->getJson('/api/builder/signature-settings')
        ->assertOk()
        ->assertJsonPath('proposal_signer_user_id', $signerA->id);
});

it('requires authentication to read signature settings', function () {
    $this->getJson('/api/builder/signature-settings')->assertUnauthorized();
});

it('forbids signature settings without team management', function () {
    $tenant = Tenant::factory()->create();
    $viewer = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($viewer);

    $this->getJson('/api/builder/signature-settings')->assertForbidden();
    $this->putJson('/api/builder/signature-settings', [])->assertForbidden();
});

it('rejects a witness slot without a team member', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($manager);

    $this->putJson('/api/builder/signature-settings', [
        'proposal_signer_user_id' => $manager->id,
        'witness_slots' => [
            ['kind' => SignatureWitnessKind::TeamUser->value],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Escolha a pessoa do time para cada vaga.');
});

it('rejects signature settings without witness slots', function () {
    $tenant = Tenant::factory()->create();
    $manager = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($manager);

    $this->putJson('/api/builder/signature-settings', [
        'proposal_signer_user_id' => $manager->id,
        'witness_slots' => [],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['witness_slots']);
});
