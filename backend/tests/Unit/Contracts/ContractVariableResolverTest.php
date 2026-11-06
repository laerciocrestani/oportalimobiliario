<?php

use App\Models\Building;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\TenantSignatureSetting;
use App\Models\Unit;
use App\Models\User;
use App\Services\ContractVariableResolver;
use App\Support\PurchaseSaleContractTemplate;

it('extracts unique placeholders from markdown', function () {
    $resolver = new ContractVariableResolver;

    expect($resolver->extractPlaceholders('Oi {{nome_cliente}} e {{ nome_cliente }} e {{comissao_extra}}'))
        ->toBe(['nome_cliente', 'comissao_extra']);
});

it('flags unknown placeholders that are not system or custom', function () {
    $resolver = new ContractVariableResolver;

    expect($resolver->unknownPlaceholders('{{nome_cliente}} {{nome_clinte}} {{comissao_extra}}', ['comissao_extra']))
        ->toBe(['nome_clinte']);
});

it('resolves system values from the latest proposal and unit', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create(['name' => 'João Corretor']);
    $building = Building::factory()->for($tenant)->create(['name' => 'Residencial Aurora']);
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '101',
        'floor' => 1,
        'area_m2' => 72.5,
        'price' => 450000.5,
    ]);
    $reservation = Reservation::factory()->for($tenant)->create([
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    $garage = Unit::factory()->for($tenant)->for($building)->create(['code' => 'S1-01']);
    $reservation->garageUnits()->attach($garage->id, ['tenant_id' => $tenant->id]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'version' => 1,
        'client_name' => 'Maria Silva',
        'client_cpf' => '52998224725',
        'land_value' => 150000,
        'payment_terms' => 'Pix + 24x',
    ]);

    $values = (new ContractVariableResolver)->systemValues($reservation);

    expect($values['nome_cliente'])->toBe('Maria Silva')
        ->and($values['cpf_cliente'])->toBe('529.982.247-25')
        ->and($values['codigo_unidade'])->toBe('101')
        ->and($values['box'])->toBe('S1-01')
        ->and($values['nome_empreendimento'])->toBe('Residencial Aurora')
        ->and($values['nome_corretor'])->toBe('João Corretor')
        ->and($values['preco_final'])->toContain('450.000')
        ->and($values['data_emissao'])->toMatch('/^\d{2}\/\d{2}\/\d{4}$/')
        ->and($values['descricao_imovel'])->toContain('unidade nº 101')
        ->and($values['descricao_imovel'])->toContain('1 vaga de garagem')
        ->and($values['preco_por_extenso'])->toContain('reais');
});

it('writes the purchase proposal clauses from the reservation', function () {
    $this->travelTo('2026-10-24 15:00:00');

    $tenant = Tenant::factory()->create(['name' => 'Construtora Aurora Ltda']);
    $broker = User::factory()->broker()->create(['name' => 'João Corretor']);
    $signer = User::factory()->builder()->for($tenant)->create(['name' => 'Helena Vargas']);
    $building = Building::factory()->for($tenant)->create([
        'name' => 'Residencial Aurora',
        'street' => 'Rua das Flores',
        'number' => '100',
        'neighborhood' => 'Centro',
        'city' => 'Bento Gonçalves',
        'state' => 'RS',
        'zip' => '95700000',
    ]);
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '101',
        'private_area_m2' => 72.5,
        'total_area_m2' => 90,
        'bedrooms' => 2,
        'suites' => 1,
        'price' => 450000.5,
    ]);
    $reservation = Reservation::factory()->for($tenant)->create([
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    $garage = Unit::factory()->for($tenant)->for($building)->create(['code' => 'S1-01']);
    $reservation->garageUnits()->attach($garage->id, ['tenant_id' => $tenant->id]);
    TenantSignatureSetting::query()->create([
        'tenant_id' => $tenant->id,
        'proposal_signer_user_id' => $signer->id,
    ]);
    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'client_name' => 'Maria Silva',
        'client_cpf' => '52998224725',
        'nationality' => 'brasileira',
        'marital_status' => 'Casado(a)',
        'profession' => 'engenheira',
        'client_rg' => '10.123.456-7',
        'address' => 'Rua do Comprador, 20',
        'city' => 'Bento Gonçalves',
        'state' => 'RS',
        'zip' => '95700001',
    ]);

    $values = (new ContractVariableResolver)->systemValues($reservation->fresh());

    expect($values['local_data'])->toBe('Bento Gonçalves/RS, 24 de outubro de 2026')
        ->and($values['qualificacao_comprador'])->toBe('Maria Silva, brasileira, Casado(a), engenheira, portador do CPF nº 529.982.247-25, RG nº 10.123.456-7, residente e domiciliado à Rua do Comprador, 20, Bento Gonçalves/RS, CEP 95700-001.')
        ->and($values['nome_construtora'])->toBe('Construtora Aurora Ltda')
        ->and($values['tipo_unidade'])->toBe('Residencial')
        ->and($values['endereco_empreendimento'])->toBe('Rua das Flores, 100, Centro, Bento Gonçalves/RS, CEP 95700-000')
        ->and($values['texto_empreendimento'])->toBe('denominado Residencial Aurora, situado à Rua das Flores, 100, Centro, Bento Gonçalves/RS, CEP 95700-000')
        ->and($values['vagas_garagem'])->toBe('1 vaga — S1-01')
        ->and($values['dados_unidade'])->toContain('**Número da unidade:** 101')
        ->and($values['dados_unidade'])->toContain('**Área privativa:** 72,50 m²')
        ->and($values['dados_unidade'])->toContain('**Área comum:** 17,50 m²')
        ->and($values['dados_unidade'])->toContain('**Vagas de garagem:** 1 vaga — S1-01')
        ->and($values['indice_correcao'])->toBe('INCC')
        ->and($values['texto_foro'])->toBe('As partes elegem o foro da comarca de Bento Gonçalves/RS para dirimir quaisquer dúvidas oriundas deste contrato.')
        ->and($values['qualificacao_corretor'])->toBe('João Corretor, intermediador da presente negociação.')
        ->and($values['qualificacao_construtora'])->toBe('Construtora Aurora Ltda, neste ato representada por Helena Vargas.')
        ->and($values['descricao_imovel'])->toBe('Descrição: unidade nº 101, no empreendimento Residencial Aurora, localizado à Rua das Flores, 100, Centro, Bento Gonçalves/RS, CEP 95700-000, com área privativa de 72,50 m², área total de 90,00 m², 2 quartos, 1 suíte, 1 vaga de garagem.')
        ->and($values['texto_matricula'])->toBe('Matrícula do Cartório de Registro de Imóveis de Bento Gonçalves/RS.')
        ->and($values['preco_por_extenso'])->toBe('quatrocentos e cinquenta mil reais e cinquenta centavos');
});

it('uses the payment description when the proposal stored one', function () {
    $tenant = Tenant::factory()->create();
    $unit = Unit::factory()->for($tenant)->create();
    $reservation = Reservation::factory()->for($tenant)->create([
        'unit_id' => $unit->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'payment_terms' => 'Documento completo da proposta',
        'commercial_terms' => [
            'description' => 'Entrada de R$ 50.000, primeiro vencimento em 10/12/2026.',
            'reinforcements' => [],
            'dations' => [],
        ],
    ]);

    expect((new ContractVariableResolver)->systemValues($reservation)['condicoes_pagamento'])
        ->toBe('Entrada de R$ 50.000, primeiro vencimento em 10/12/2026.');
});

it('treats a placeholder marked with ? as optional', function () {
    $resolver = new ContractVariableResolver;

    expect($resolver->extractPlaceholders('Box {{box?}} e cliente {{nome_cliente}}'))
        ->toBe(['box', 'nome_cliente'])
        ->and($resolver->optionalPlaceholderSlugs('{{box?}} {{valor_entrada}} {{box?}}'))
        ->toBe(['box']);

    $template = new ContractTemplate([
        'body_markdown' => 'Entrada {{valor_entrada}}. Box {{box?}}. Extra {{nao_existe?}}.',
        'custom_variables' => [
            ['slug' => 'valor_entrada', 'label' => 'Valor de entrada'],
            ['slug' => 'box', 'label' => 'Box'],
            ['slug' => 'nao_existe', 'label' => 'Não existe'],
        ],
    ]);

    expect($resolver->requiredCustomSlugs($template))->toBe(['valor_entrada']);
});

it('keeps the default purchase contract on known variables', function () {
    $resolver = new ContractVariableResolver;

    expect($resolver->unknownPlaceholders(PurchaseSaleContractTemplate::body()))->toBe([])
        ->and(PurchaseSaleContractTemplate::body())->toContain('PROMESSA DE COMPRA E VENDA')
        ->and(PurchaseSaleContractTemplate::body())->toContain('{dados_unidade}')
        ->and(PurchaseSaleContractTemplate::body())->toContain('{{qualificacao_comprador}}')
        ->and(PurchaseSaleContractTemplate::body())->toContain('{{condicoes_pagamento}}');
});

it('requires custom and unknown placeholders used in the body', function () {
    $template = new ContractTemplate([
        'body_markdown' => 'Paga {{comissao_extra}} e {{nome_clinte}}. Cliente {{nome_cliente}}.',
        'custom_variables' => [
            ['slug' => 'comissao_extra', 'label' => 'Comissão'],
            ['slug' => 'nao_usada', 'label' => 'Não usada'],
        ],
    ]);

    expect((new ContractVariableResolver)->requiredCustomSlugs($template))
        ->toBe(['comissao_extra', 'nome_clinte']);
});
