# Feature: builder-reservations

## Objetivo

Módulo de reservas no perfil construtora com listagem, cancelamento e troca de mensagens com corretores; observações opcionais na criação da reserva pelo corretor.

## Requisitos

- `REQ-BLD-RES-001`: Nav construtora com item **Reservas** (`/reservations`), visível com permissão `reservations.cancel`
- `REQ-BLD-RES-002`: Listagem em tabela (`GET /api/builder/reservations`): cliente, empreendimento, corretor, data, ações
- `REQ-BLD-RES-003`: Ações: cancelar reserva (`DELETE`) e responder corretor via thread (`GET/POST .../messages`)
- `REQ-BLD-RES-004`: Corretor envia `observations` opcional na criação; vira primeira mensagem da thread
- `REQ-BLD-RES-005`: Corretor visualiza e responde thread (`GET/POST /api/broker/reservations/{id}/messages`)
- `REQ-BLD-RES-006`: Corretor lista reservas próprias (`GET /api/broker/reservations`) — espelho da construtora
- `REQ-BLD-RES-007`: Badge na nav **Reservas** com contagem de reservas aguardando resposta (`pending-replies-count`)

## Dependências

- reservations, broker-dashboard, builder-team (permissões)

## Status

done
