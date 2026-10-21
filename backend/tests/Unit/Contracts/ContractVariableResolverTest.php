<?php

use App\Models\Building;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Services\ContractVariableResolver;

it('extracts unique placeholders from markdown', function () {
    $resolver = new ContractVariableResolver;

    expect($resolver->extractPlaceholders("Oi {{nome_cliente}} e {{ nome_cliente }} e {{comissao_extra}}"))
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
        ->and($values['data_emissao'])->toMatch('/^\d{2}\/\d{2}\/\d{4}$/');
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
