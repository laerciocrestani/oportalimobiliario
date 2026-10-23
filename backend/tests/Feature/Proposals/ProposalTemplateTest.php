<?php

/**
 * @see REQ-RPF-010
 */
use App\Models\BrokerClient;
use App\Models\ProposalTemplate;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\CommercialProposalTemplate;
use Laravel\Sanctum\Sanctum;

it('does not expose custom proposal template endpoints', function () {
    $this->getJson('/api/builder/proposal-templates')->assertNotFound();
    $this->postJson('/api/builder/proposal-templates', [])->assertNotFound();
    $this->getJson('/api/builder/proposal-variables')->assertNotFound();
});

it('replaces custom proposal templates with the commercial proposal', function () {
    $tenant = Tenant::factory()->create();
    $other = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['code' => '1201']);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    $client = BrokerClient::factory()->create([
        'broker_id' => $broker->id,
        'name' => 'Ana Silva',
        'phone' => '11988888888',
        'email' => 'ana@example.com',
    ]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    ProposalTemplate::factory()->for($tenant)->create([
        'name' => 'Personalizada A',
        'body_markdown' => 'Comissão {{comissao_extra}}',
        'custom_variables' => [
            ['slug' => 'comissao_extra', 'label' => 'Comissão extra'],
        ],
    ]);
    ProposalTemplate::factory()->inactive()->for($tenant)->create(['name' => 'Personalizada B']);
    $foreign = ProposalTemplate::factory()->for($other)->create(['name' => 'Outra construtora']);

    Sanctum::actingAs($broker);

    $response = $this->getJson("/api/broker/reservations/{$reservation->id}/proposal/templates")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', CommercialProposalTemplate::NAME)
        ->assertJsonPath('0.prefill.nome_cliente', 'Ana Silva');

    expect($response->json('0.body_markdown'))
        ->toContain('{{condicoes_pagamento}}')
        ->toContain('{reforcos}')
        ->toContain('{dacoes}')
        ->not->toContain('valor_entrada');
    expect(collect($response->json('0.variables'))->pluck('slug')->all())
        ->toContain('condicoes_pagamento')
        ->not->toContain('comissao_extra')
        ->not->toContain('valor_entrada');

    expect(ProposalTemplate::query()->withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count())->toBe(1);
    expect(ProposalTemplate::query()->withoutGlobalScope('tenant')->find($foreign->id)?->name)->toBe('Outra construtora');
});
