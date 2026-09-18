<?php

/**
 * @see REQ-RPF-010
 */
use App\Models\ProposalTemplate;
use App\Models\Tenant;
use App\Models\User;
use App\Support\BuilderPermissions;
use App\Support\ContractSystemVariables;
use Laravel\Sanctum\Sanctum;

it('lists proposal templates for the current tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();

    ProposalTemplate::factory()->for($alpha)->create(['name' => 'Alpha proposta']);
    ProposalTemplate::factory()->for($beta)->create(['name' => 'Beta proposta']);

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/proposal-templates')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Alpha proposta');
});

it('creates a proposal template', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/proposal-templates', [
        'name' => 'Proposta comercial',
        'body_markdown' => 'Cliente {{nome_cliente}} paga {{comissao_extra}}',
        'custom_variables' => [
            ['slug' => 'comissao_extra', 'label' => 'Comissão extra'],
        ],
        'is_active' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Proposta comercial')
        ->assertJsonPath('custom_variables.0.slug', 'comissao_extra')
        ->assertJsonPath('is_active', true);

    expect(ProposalTemplate::query()->where('tenant_id', $tenant->id)->count())->toBe(1);
});

it('updates and deactivates a proposal template', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $template = ProposalTemplate::factory()->for($tenant)->create(['name' => 'Original']);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/proposal-templates/{$template->id}", [
        'name' => 'Atualizado',
        'is_active' => false,
    ])
        ->assertOk()
        ->assertJsonPath('name', 'Atualizado')
        ->assertJsonPath('is_active', false);
});

it('deletes a proposal template', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $template = ProposalTemplate::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/proposal-templates/{$template->id}")
        ->assertNoContent();

    expect(ProposalTemplate::query()->find($template->id))->toBeNull();
});

it('forbids proposal templates without proposals.manage', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
        BuilderPermissions::MANAGE_CONTRACTS,
    ])->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/proposal-templates')->assertForbidden();
    $this->getJson('/api/builder/proposal-variables')->assertForbidden();
});

it('rejects invalid custom variable slugs', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/proposal-templates', [
        'name' => 'Inválido',
        'body_markdown' => 'Texto',
        'custom_variables' => [
            ['slug' => 'Nome Cliente', 'label' => 'Nome'],
        ],
    ])->assertUnprocessable();
});

it('rejects duplicate template names in the same tenant', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    ProposalTemplate::factory()->for($tenant)->create(['name' => 'Padrão']);

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/proposal-templates', [
        'name' => 'Padrão',
        'body_markdown' => 'Outro',
    ])->assertUnprocessable();
});

it('isolates proposal templates by tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $betaTemplate = ProposalTemplate::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->patchJson("/api/builder/proposal-templates/{$betaTemplate->id}", [
        'name' => 'Hacked',
    ])->assertNotFound();
});

it('lists closed system variables for proposal templates', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/proposal-variables')
        ->assertOk()
        ->assertJsonFragment(['slug' => 'nome_cliente'])
        ->assertJsonFragment(['slug' => 'condicoes_pagamento']);

    expect(ContractSystemVariables::slugs())->toContain('nome_cliente', 'cpf_conjuge', 'data_emissao');
});
