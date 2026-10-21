---
branch: main
status: in_progress
depends_on: reservations
source: docs/discovery/resumo-reserva-direta-proposta-zapsign.md
---

# Feature: reservation-direct-proposal

## Objetivo

O corretor reserva a unidade e envia a proposta no mesmo passo. A coluna Pré-reserva deixa de existir. A construtora analisa, aceita ou recusa. A assinatura de proposta e contrato vai para o ZapSign da plataforma.

## Requisitos

- `REQ-RDP-001`: Clicar em Reservar trava a unidade e abre um rascunho de 20 minutos corridos, invisível para a construtora.
- `REQ-RDP-002`: Sem envio nesse prazo, a reserva é descartada e a unidade volta a ficar disponível.
- `REQ-RDP-003`: O envio exige nome, telefone e e-mail do cliente e coloca o card em Proposta em análise.
- `REQ-RDP-004`: A construtora tem 48 horas úteis para aceitar ou recusar. O relógio pausa em sábado, domingo e feriado nacional. Não há devolução.
- `REQ-RDP-005`: Substituir a proposta reinicia as 48 horas úteis. Prorrogar soma X horas úteis ao prazo atual. Sem decisão no fim do prazo, a reserva é recusada e a unidade libera.
- `REQ-RDP-006`: O aceite gera o PDF e envia ao ZapSign. Formalização espera comprador, signatário da construtora e corretor. A unidade só segue depois das três assinaturas.
- `REQ-RDP-007`: O link sai por WhatsApp e e-mail juntos quando há e-mail. Sem e-mail, só WhatsApp. Às 8h, quem não assinou é avisado. Corretor ou construtora reenviam pelo botão.
- `REQ-RDP-008`: Config geral da construtora define o signatário da proposta e as testemunhas do contrato, inclusive a vaga do corretor da venda. Vale para documentos gerados depois de salva.
- `REQ-RDP-009`: Sinal em PIX só depois das três assinaturas da proposta. Sinal em bem, já descrito na proposta, não pede valor nem PIX.
- `REQ-RDP-010`: O corretor preenche os dados completos do cliente antes de gerar o contrato. O contrato assina no ZapSign com comprador, construtora e as testemunhas da config.
- `REQ-RDP-011`: Cards que já estão em pré-reserva são cancelados. A coluna Pré-reserva sai dos dois portais.

## Fora deste spec

- Prazo novo para o comprador pagar o PIX.
- Teto de alterações da proposta.
- Credencial ZapSign por construtora.
