<?php

use App\Services\ContractPdfRenderer;
use App\Support\CommercialProposalTemplate;

it('renders markdown placeholders into a pdf document', function () {
    $pdf = (new ContractPdfRenderer)->render(
        '# Contrato\n\nCliente {{nome_cliente}}.',
        ['nome_cliente' => 'Maria Silva'],
    );

    expect($pdf)->toStartWith('%PDF');
});

it('renders the purchase proposal document', function () {
    $pdf = (new ContractPdfRenderer)->render(CommercialProposalTemplate::body(), [
        'local_data' => 'Bento Gonçalves/RS, 24 de outubro de 2026',
        'qualificacao_comprador' => 'Maria Silva, brasileira.',
        'qualificacao_corretor' => 'João Corretor, intermediador da presente negociação.',
        'qualificacao_construtora' => 'Construtora Aurora Ltda.',
        'descricao_imovel' => 'Descrição: unidade nº 101.',
        'texto_matricula' => 'Matrícula do Cartório de Registro de Imóveis de Bento Gonçalves/RS.',
        'preco_por_extenso' => 'quatrocentos e cinquenta mil reais',
        'preco_final' => '450.000,00',
        'condicoes_pagamento' => 'Entrada de R$ 50.000,00.',
        'correcao_modo' => 'incc',
    ]);

    expect($pdf)->toStartWith('%PDF');
});
