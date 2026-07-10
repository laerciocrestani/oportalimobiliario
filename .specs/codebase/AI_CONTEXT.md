# AI Context — índice de documentação

Mapa da documentação **deste repositório** para agentes de IA.  
Cada projeto é independente — nada aqui é compartilhado ou sincronizado com outros repos.

## Por onde começar

1. [`AGENTS.md`](../../AGENTS.md) — leitura obrigatória
2. [`.specs/project/STATE.md`](../project/STATE.md) — memória da sessão
3. Índices em `.specs/codebase/` (tabela abaixo)

## Índices (`.specs/codebase/`)

| Arquivo | Pergunta que responde |
|---------|---------------------|
| [TRACEABILITY.md](./TRACEABILITY.md) | Onde está implementado cada `REQ-*`? |
| [SEEDS.md](./SEEDS.md) | Quais usuários/senhas usar em dev? |
| [FLOWS.md](./FLOWS.md) | Como o fluxo end-to-end funciona? |
| [FRONTEND.md](./FRONTEND.md) | Rotas, portais, cliente HTTP |
| [PERMISSIONS.md](./PERMISSIONS.md) | Quem pode fazer o quê? |
| [GLOSSARY.md](./GLOSSARY.md) | Mapeamento idioma UI ↔ código |
| [ANTI-PATTERNS.md](./ANTI-PATTERNS.md) | Erros que a IA não deve repetir |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Visão técnica |
| [CONVENTIONS.md](./CONVENTIONS.md) | Estilo e comandos |

## Checklist manual de dev

[`docs/DEV_ACCESS.md`](../../docs/DEV_ACCESS.md) — URLs, credenciais e smoke tests passo a passo.

## Formato de feature spec

```markdown
---
branch: main
status: done | in_progress | planned
depends_on: tenancy, auth
---

# Feature: nome

## Requisitos

- `REQ-XXX-001`: descrição
```

Ao fechar uma feature: atualizar `TRACEABILITY.md` neste repo.

## Workflow multi-agent

Ver [`.cursor/rules/multi-agent.mdc`](../../.cursor/rules/multi-agent.mdc):

- 1 agent = 1 feature = 1 frente (BE ou FE)
- Backend antes do frontend que consome API
- Só orquestrador atualiza `STATE.md`

## Escopo deste projeto

| Aspecto | Valor |
|---------|-------|
| Produto | SaaS lançamentos imobiliários (BR) |
| Tenancy | `tenant_id` (construtora) |
| Portais | construtora / corretor / admin / www |
| Skill de convenções | `opim-conventions` |
| i18n | EN no código, PT na UI |

Toda regra de negócio e path de arquivo referem-se **apenas** a este repositório.
