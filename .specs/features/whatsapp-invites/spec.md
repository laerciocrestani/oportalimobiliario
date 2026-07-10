# Feature: whatsapp-invites

## Objetivo

Enviar convites de corretor via WhatsApp Business API (Cloud API), além de e-mail e cópia manual de link.

## Requisitos

- `REQ-WA-001`: Convite armazena `name` (obrigatório), `email` e `phone` opcionais conforme canal
- `REQ-WA-002`: Canal de envio: `email`, `whatsapp` ou `link` (só copiar)
- `REQ-WA-003`: Envio WhatsApp despacha template `broker_invite` via Cloud API
- `REQ-WA-004`: Número único da plataforma (config global)
- `REQ-WA-005`: Aceite exige e-mail quando ausente no convite; nome pré-preenchido
- `REQ-WA-006`: Webhook público Meta para verificação e status de entrega
- `REQ-WA-007`: UI construtora com seleção de canal e status de entrega

## Dependências

- broker-invites

## Status

done
