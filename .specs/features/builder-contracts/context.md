# builder-contracts Context

**Gathered:** 2026-08-19
**Spec:** `.specs/features/builder-contracts/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Catálogo de modelos no portal da construtora + emissão de PDF na reserva (variáveis + R$ final). Sem assinatura GOV nesta fatia.

---

## Implementation Decisions

### Premissas de produto

- Editar/reemitir muda o contrato **da reserva**, não o modelo do catálogo.
- Corretor **vê e baixa** o PDF, sem editar.
- Reemitir **substitui** o PDF até existir contrato assinado.
- Menu **Contratos** na construtora.
- `contracts.manage` para CRUD; emitir com quem já acessa reservas.

### Emissão

- Variável custom vazia → **bloquear**.
- Modelo inativo **some** da lista de emitir.
- Dialog: só valores das variáveis (sistema + custom) e o R$ final.
- Override de R$ **entra nesta fatia** (`frozen_price_brl`).

### Agent's Discretion

- Lib de PDF: `barryvdh/laravel-dompdf`.
- Editor FE: TipTap (StarterKit) com Markdown na API.
- Slugs das variáveis de sistema em pt-BR (`{{nome_cliente}}`) — o gestor escreve o modelo em português.

---

## Deferred Ideas

- Assinatura GOV, upload assinado, validar venda.
- Envio por e-mail/WhatsApp.
- Editar texto completo no dialog de emitir.
