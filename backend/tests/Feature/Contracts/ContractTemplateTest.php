<?php

/**
 * @see REQ-CTR-002
 * @see REQ-CTR-003
 * @see REQ-CTR-005
 * @see REQ-CTR-007
 */
use App\Models\ContractTemplate;
use App\Models\Tenant;
use App\Models\User;
use App\Support\BuilderPermissions;
use App\Support\ContractSystemVariables;
use Laravel\Sanctum\Sanctum;

it('lists contract templates for the current tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();

    ContractTemplate::factory()->for($alpha)->create(['name' => 'Alpha modelo']);
    ContractTemplate::factory()->for($beta)->create(['name' => 'Beta modelo']);

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/contract-templates')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Alpha modelo');
});

it('creates a contract template', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/contract-templates', [
        'name' => 'Compra e venda',
        'body_markdown' => 'Cliente {{nome_cliente}} paga {{comissao_extra}}',
        'custom_variables' => [
            ['slug' => 'comissao_extra', 'label' => 'Comissão extra'],
        ],
        'is_active' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Compra e venda')
        ->assertJsonPath('custom_variables.0.slug', 'comissao_extra')
        ->assertJsonPath('is_active', true);

    expect(ContractTemplate::query()->where('tenant_id', $tenant->id)->count())->toBe(1);
});

it('updates and deactivates a contract template', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $template = ContractTemplate::factory()->for($tenant)->create(['name' => 'Original']);

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/contract-templates/{$template->id}", [
        'name' => 'Atualizado',
        'is_active' => false,
    ])
        ->assertOk()
        ->assertJsonPath('name', 'Atualizado')
        ->assertJsonPath('is_active', false);
});

it('deletes a contract template', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $template = ContractTemplate::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/contract-templates/{$template->id}")
        ->assertNoContent();

    expect(ContractTemplate::query()->find($template->id))->toBeNull();
});

it('forbids contract templates without contracts.manage', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/contract-templates')->assertForbidden();
    $this->getJson('/api/builder/contract-variables')->assertForbidden();
});

it('rejects invalid custom variable slugs', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/contract-templates', [
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
    ContractTemplate::factory()->for($tenant)->create(['name' => 'Padrão']);

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/contract-templates', [
        'name' => 'Padrão',
        'body_markdown' => 'Outro',
    ])->assertUnprocessable();
});

it('isolates contract templates by tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $betaTemplate = ContractTemplate::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->patchJson("/api/builder/contract-templates/{$betaTemplate->id}", [
        'name' => 'Hacked',
    ])->assertNotFound();
});

it('lists closed system variables', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/contract-variables')
        ->assertOk()
        ->assertJsonFragment(['slug' => 'nome_cliente'])
        ->assertJsonFragment(['slug' => 'preco_final']);

    expect(ContractSystemVariables::slugs())->toContain('nome_cliente', 'cpf_conjuge', 'data_emissao');
});
