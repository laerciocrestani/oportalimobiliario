Olá, {{ $recipientName }},

@if ($documentLabel === 'contrato')
O contrato está pronto para assinatura. Acesse o link abaixo:
@else
A proposta está pronta para assinatura. Acesse o link abaixo:
@endif

{{ $signUrl }}
