---
branch: feature/kanban-ajustes
status: in_progress
depends_on: reservation-progress-flex
source: docs/discovery/resumo-modal-andamento-por-coluna.md
---

# Feature: modal de andamento por coluna

## Objetivo

O dialog **Andamento da reserva** deixa de repetir a esteira de etapas (já visível no Kanban). Layout **60% painel da coluna / 40% chat**. Arquivos/PDFs/contratos sempre visíveis.

## Premissas (confirmadas na execução)

- Chat = 40% da largura, altura total; vendida ainda envia mensagem; cancelada só leitura.
- Arquivos sempre no painel esquerdo (lista vazia se não houver anexo).
- Só a ação pendente da coluna; formulários de outras colunas em overlay.
- Pré-reserva: CTAs “Enviar proposta” / “Anexar comprovante” abrem overlay, sem o form no miolo.

## Requisitos

- `REQ-RPC-001`: Layout 60/40 com chat embutido ao abrir o card.
- `REQ-RPC-002`: Não renderizar etapas upcoming/completed de outras colunas.
- `REQ-RPC-003`: Painéis e CTAs filtrados pela `kanban_column` derivada do stage.
- `REQ-RPC-004`: Zona de arquivos sempre visível.
- `REQ-RPC-005`: Chat somente leitura em reserva cancelada.
