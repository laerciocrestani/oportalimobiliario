<?php

use App\Services\ContractPdfRenderer;

it('renders markdown placeholders into a pdf document', function () {
    $pdf = (new ContractPdfRenderer)->render(
        '# Contrato\n\nCliente {{nome_cliente}}.',
        ['nome_cliente' => 'Maria Silva'],
    );

    expect($pdf)->toStartWith('%PDF');
});
