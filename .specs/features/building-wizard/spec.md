---
branch: main
status: done
depends_on: buildings, tenancy, auth
source: docs/discovery/resumo-wizard-empreendimentos.md
---

# Feature: wizard de criação de empreendimentos

## Objetivo

Substituir o create atual (só nome) por um wizard de 4 steps que injeta endereço, torres, andares, unidades, mídia e descritivo. Persistência por step, rascunho retomável, preço sempre em INCC-M.

## Requisitos

- `REQ-WIZ-001`: Wizard de **criação** em 4 steps no portal construtora; edição posterior permanece nas telas atuais (estendidas).
- `REQ-WIZ-002`: Step 1 — nome + endereço completo; CEP via ViaCEP com fallback manual.
- `REQ-WIZ-003`: Persistência **por step** no servidor; rascunho retomável (`published = false` até o switch final).
- `REQ-WIZ-004`: Step 2 — N torres; cada torre com quantidade de andares independente; prédio CSS clicável.
- `REQ-WIZ-005`: Step 3 — planta típica (N unidades/andar) replicada; códigos `101…105` gerados e editáveis.
- `REQ-WIZ-006`: Remover unidade de um andar **redesenha o andar inteiro**.
- `REQ-WIZ-007`: Tipo do andar inteiro: `residential` (padrão) ou `commercial`; mesmos campos da ficha.
- `REQ-WIZ-008`: Ficha da unidade: preço-base, área privativa, área total, banheiros, suítes, quartos, lavabos, sacadas, posição solar, período de sol, posição do imóvel, forro, aberturas, piso. Preço pode faltar no wizard.
- `REQ-WIZ-009`: Defaults do empreendimento (forro, aberturas, piso, adicionais do prédio, solar/sol). Unidade **não desliga** adicional do prédio; adicionais da unidade somam.
- `REQ-WIZ-010`: Catálogo fechado de adicionais, CRUD no **admin SaaS**. Construtora só seleciona.
- `REQ-WIZ-011`: Preço **sempre INCC-M**. Final = `base × (INCC_vigente / INCC_competência)`. Índice cai → R$ cai. `available` e `reserved` recalculam. `sold` usa R$ congelado na emissão do contrato.
- `REQ-WIZ-012`: Tabela de INCC-M no banco é a única fonte do cálculo. Job **diário 08:05** (`America/Sao_Paulo`) insere competência nova se a API trouxer; **não sobrescreve** linha existente.
- `REQ-WIZ-013`: Admin lista/cria/edita INCC-M; helper BCB só sugere na UI e no job.
- `REQ-WIZ-014`: Step 4 — mídia `internal`/`external`, descritivo, botão gerar com IA (Gemini e GPT no backend, provedor via env). Switch **Rascunho** = `published`.
- `REQ-WIZ-015`: Desligar rascunho exige unidades à venda com preço (bloquear publicar incompleto).
- `REQ-WIZ-016`: APIs de corretor/público expõem preço **calculado** (não o bruto sem correção).
- `REQ-WIZ-017`: Feature tests Pest + OpenAPI + Vitest do wizard (steps e prédio CSS). Seeders/factories das novas tabelas.

## Fora desta fatia

- Hook de override de R$ na emissão do contrato (coluna nasce agora; UI do contrato é feature de contratos).
- Planta baixa (`floor_plan`) obrigatória no wizard.
- Edição em massa pós-publicação via wizard.
- Construtora criar itens do catálogo de adicionais.
