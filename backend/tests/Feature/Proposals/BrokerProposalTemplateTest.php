<?php

use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\ProposalTemplate;
use App\Models\Reservation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use App\Support\CommercialProposalTemplate;
use Laravel\Sanctum\Sanctum;

it('lists active proposal templates of the building owner for the broker', function () {
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

    ProposalTemplate::factory()->inactive()->for($tenant)->create(['name' => 'Inativo']);
    ProposalTemplate::factory()->for($other)->create(['name' => 'Outra construtora']);

    Sanctum::actingAs($broker);

    $response = $this->getJson("/api/broker/reservations/{$reservation->id}/proposal/templates")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Proposta comercial padrão')
        ->assertJsonPath('0.prefill.nome_cliente', 'Ana Silva')
        ->assertJsonPath('0.prefill.telefone_cliente', '11988888888')
        ->assertJsonPath('0.prefill.email_cliente', 'ana@example.com')
        ->assertJsonMissingPath('0.prefill.condicoes_pagamento');

    $condicoes = collect($response->json('0.variables'))->firstWhere('slug', 'condicoes_pagamento');

    expect($condicoes)->toMatchArray([
        'slug' => 'condicoes_pagamento',
        'label' => 'Descreva as condições de pagamento',
        'required' => true,
        'multiline' => true,
        'placeholder' => CommercialProposalTemplate::PAYMENT_PLACEHOLDER,
    ])
        ->and(collect($response->json('0.variables'))->pluck('slug')->all())->not->toContain(
            'valor_entrada',
            'vencimento_entrada',
            'parcelas_quantidade',
            'parcela_valor',
            'parcelas_total',
            'primeiro_vencimento',
            'reforcos_total',
            'observacoes',
        );
});

it('prefills the unit code and the building name used in the template', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create(['name' => 'Residencial Bosque']);
    $unit = Unit::factory()->for($tenant)->for($building)->create(['code' => '1201']);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/proposal/templates")
        ->assertOk()
        ->assertJsonPath('0.prefill.nome_empreendimento', 'Residencial Bosque')
        ->assertJsonPath('0.prefill.codigo_unidade', '1201')
        ->assertJsonPath('0.prefill.correcao_modo', 'incc');
});

it('marks optional placeholders and prefills price, broker and issue date', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create(['name' => 'Danilo Reis']);
    $building = Building::factory()->for($tenant)->create(['name' => 'Novo 300']);
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '1009',
        'price' => 375000,
    ]);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    $garage = Unit::factory()->for($tenant)->for($building)->create(['code' => 'S1-01']);
    $reservation->garageUnits()->attach($garage->id, ['tenant_id' => $tenant->id]);

    Sanctum::actingAs($broker);

    $response = $this->getJson("/api/broker/reservations/{$reservation->id}/proposal/templates")
        ->assertOk()
        ->assertJsonPath('0.prefill.preco_final', '375.000,00')
        ->assertJsonPath('0.prefill.nome_corretor', 'Danilo Reis')
        ->assertJsonPath('0.prefill.data_emissao', now('America/Sao_Paulo')->format('d/m/Y'))
        ->assertJsonPath('0.prefill.box', 'S1-01');

    $variables = collect($response->json('0.variables'))->keyBy('slug');

    expect($variables->get('condicoes_pagamento')['required'])->toBeTrue()
        ->and($variables->keys()->all())->not->toContain(
            'box',
            'nome_corretor',
            'data_emissao',
            'preco_final',
            'preco_unidade_original',
            'preco_unidade_corrigido',
            'preco_vaga_original',
            'preco_vaga_corrigido',
        );
});

it('omits client email from the prefill when the client has none', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create();

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);
    linkBrokerToTenant($broker, $tenant);

    $client = BrokerClient::factory()->create([
        'broker_id' => $broker->id,
        'name' => 'Carlos Lima',
        'phone' => '11977777777',
        'email' => null,
    ]);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/reservations/{$reservation->id}/proposal/templates")
        ->assertOk()
        ->assertJsonPath('0.prefill.nome_cliente', 'Carlos Lima')
        ->assertJsonMissingPath('0.prefill.email_cliente');
});

it('forbids listing proposal templates of another broker reservation', function () {
    $tenant = Tenant::factory()->create();
    $owner = User::factory()->broker()->create();
    $intruder = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create();

    linkBrokerToTenant($intruder, $tenant);

    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $owner->id,
    ]);

    Sanctum::actingAs($intruder);

    $this->getJson("/api/broker/reservations/{$reservation->id}/proposal/templates")
        ->assertForbidden();
});
