<?php

use App\Support\ProposalModuleMarkdown;

it('replaces the fixed reinforcement and dation lines with modules', function () {
    $markdown = <<<'MD'
### Reforços

**Valor:** R$ {{reforco_1_valor?}} · **Venc.:** {{reforco_1_vencimento?}}

**Valor:** R$ {{reforco_2_valor?}} · **Venc.:** {{reforco_2_vencimento?}}

**Total:** R$ {{reforcos_total?}}

**Dação 1:** {{dacao_1?}}

**Dação 2:** {{dacao_2?}}

**OBS:** {{observacoes?}}
MD;

    $converted = ProposalModuleMarkdown::replaceFixedBlocks($markdown);

    expect($converted)->toContain("{reforcos}\n")
        ->and($converted)->toContain("{dacoes}\n")
        ->and($converted)->not->toContain('reforco_1_valor')
        ->and($converted)->not->toContain('dacao_1')
        ->and($converted)->toContain('{{reforcos_total?}}')
        ->and($converted)->toContain('{{observacoes?}}');
});

it('expands filled module rows and omits blank ones', function () {
    $markdown = "{reforcos}\n\n{dacoes}";

    $expanded = ProposalModuleMarkdown::expand($markdown, [
        'reforco_1_valor' => '10.000,00',
        'reforco_1_vencimento' => '10/11/2026',
        'reforco_2_valor' => '',
        'reforco_2_vencimento' => '',
        'reforco_3_valor' => '5.000,00',
        'reforco_3_vencimento' => '10/12/2026',
        'dacao_1' => 'Apartamento na rua A',
        'dacao_2' => '',
    ]);

    expect($expanded)->toBe(<<<'MD'
**Valor:** R$ 10.000,00 · **Venc.:** 10/11/2026

**Valor:** R$ 5.000,00 · **Venc.:** 10/12/2026

**Dação 1:** Apartamento na rua A
MD);
});

it('uses a fixed-price clause when correcao_modo is fixed', function () {
    $expanded = ProposalModuleMarkdown::expand(
        "{bloco_preco_unidade}\n\n{correcao_parcelas}\n\n{correcao_reforcos}",
        [
            'correcao_modo' => 'fixed',
            'preco_unidade_corrigido' => '250.000,00',
            'preco_unidade_original' => '200.000,00',
        ],
    );

    expect($expanded)->toContain('**Valor da unidade:** R$ 250.000,00 (original R$ 200.000,00)')
        ->and($expanded)->toContain('sem correção pelo INCC')
        ->and($expanded)->not->toContain('saldo positivo do INCC');
});

it('drops the fixed slugs from the custom variable list', function () {
    $variables = ProposalModuleMarkdown::withoutFixedVariables([
        ['slug' => 'valor_entrada', 'label' => 'Valor de entrada'],
        ['slug' => 'reforco_1_valor', 'label' => 'Reforço 1'],
        ['slug' => 'dacao_2', 'label' => 'Dação 2'],
        ['slug' => 'reforcos_total', 'label' => 'Total dos reforços'],
    ]);

    expect($variables)->toBe([
        ['slug' => 'valor_entrada', 'label' => 'Valor de entrada'],
        ['slug' => 'reforcos_total', 'label' => 'Total dos reforços'],
    ]);
});
