Olá, {{ $invite->name }},

Você foi convidado(a) para atuar como corretor(a) na construtora {{ $invite->tenant->name }}.

Para aceitar o convite e criar sua conta, acesse o link abaixo:

{{ $inviteUrl }}

Este convite expira em {{ $invite->expires_at->format('d/m/Y H:i') }}.
