---
feature: building-wizard
status: done
---

# Design — Wizard de criação de empreendimentos

Fonte: `docs/discovery/resumo-wizard-empreendimentos.md` (aprovado 2026-08-19).

## C4 — containers

```
Construtora SPA ──► Laravel API ──► PostgreSQL
Admin SPA ─────────►      │
Scheduler 08:05 ──► BCB SGS (helper) ─► INSERT incc_indices (se competência nova)
API ──► ViaCEP (proxy CEP)
API ──► Gemini / GPT (descritivo, env)
Cálculo de preço: SOMENTE PostgreSQL (nunca BCB em runtime)
```

Portais: `construtora` (`/buildings/new`, `/buildings/:id/wizard`) e `admin` (`/incc`, `/amenities`). Público e corretor só consomem DTO com preço já corrigido.

## Decisões

| ID | Decisão | Por quê | Alternativa rejeitada |
|----|---------|---------|------------------------|
| D-01 | Entidade `Floor` (andar) | Tipo comercial/residencial e redesenho são do andar, não da unidade | Só `units.floor` int — exceção de planta vira gambiarra |
| D-02 | Preço calculado **na leitura** | INCC muda sem regravar N unidades | Materializar R$ no job — desatualiza se admin editar o índice |
| D-03 | Proxy `GET /api/builder/cep/{cep}` | Testável, timeout no servidor | Front chamar ViaCEP direto (CORS ok, mas sem Pest) |
| D-04 | Job **insert-only** | Admin é soberano; divulgação em dia variável | Upsert diário apagaria correção manual |
| D-05 | Herança por `NULL` na unidade | Default do prédio muda e propaga | Copiar valores no generate — drift |
| D-06 | Adicionais do prédio resolvidos no DTO (união) | Unidade não pode desligar o do prédio | Copiar pivot na geração |
| D-07 | `PUT` de estrutura só em rascunho | Permite refazer torres sem migrar reservas | PATCH unitário no wizard (lento) |
| D-08 | CSS isométrico, sem WebGL | Pedido: profundidade flat, simples | Three.js |

## Modelo de dados

### Globais (sem `tenant_id`)

**`incc_indices`**
- `competence` date (1º do mês), unique
- `value` decimal(12,6) — número-índice INCC-M
- `source` enum `job` \| `manual`
- `fetched_at` nullable

**`amenities`**
- `slug` unique, `name`, `active` boolean default true
- Selecionável em empreendimento e em unidade

### Tenant (`BelongsToTenant`)

**`buildings`** (colunas novas)
- Endereço: `zip`, `street`, `number`, `complement`, `neighborhood` (`city`/`state` já existem)
- Defaults: `ceiling_type`, `opening_type`, `flooring_type`, `solar_position`, `sun_period` (enums string)
- `wizard_step` tinyint 1–4, `wizard_completed_at` nullable

**`towers`**
- `floors_count` unsigned

**`floors`** (novo)
- `tower_id`, `number` (1…N), `kind` `residential` \| `commercial`
- unique (`tower_id`, `number`)

**`units`** (colunas novas; `price` atual vira base)
- `floor_id`
- `private_area_m2`, `total_area_m2` (`area_m2` migrado → privativa)
- `bedrooms`, `bathrooms`, `suites`, `powder_rooms`, `balconies` unsigned
- `solar_position`, `sun_period`, `property_position` (`corner` \| `front` \| `rear`)
- `ceiling_type`, `opening_type`, `flooring_type` nullable (= herda)
- `price_base` (renomear `price`), `price_competence` date nullable
- `frozen_price_brl` nullable — preenchido na emissão do contrato (feature contratos)

**Pivôs:** `building_amenity`, `unit_amenity` (`amenity_id`).

### Resolução de preço

```
vigente = incc_indices mais recente com value NOT NULL
se frozen_price_brl → usar esse
senão se price_base e price_competence e INCC da competência →
  price_display = price_base * (vigente / incc(competência))
senão → null
```

Expor no JSON: `price` (calculado, compatível), `price_base`, `price_competence`, `price_incc_current`.

## API

### Construtora (`buildings.manage`)

| Método | Path | Step |
|--------|------|------|
| POST | `/api/builder/buildings` | 1 — nome + endereço, `published=false` |
| PATCH | `/api/builder/buildings/{building}` | 1/4 — endereço, defaults, `description`, `published` |
| PUT | `/api/builder/buildings/{building}/structure` | 2 — substitui torres+andares se rascunho |
| PUT | `/api/builder/buildings/{building}/unit-grid` | 3 — gera/reaplica grade; redesenho por andar |
| POST | `/api/builder/buildings/{building}/generate-description` | 4 — IA |
| GET | `/api/builder/cep/{cep}` | 1 — proxy ViaCEP |
| GET | `/api/builder/amenities` | catálogo ativo |

Mídia: endpoints atuais de `BuildingMedia`. CRUD avulso de torre/unidade permanece para **pós-wizard**.

`PUT structure` / `PUT unit-grid`: 409 se `wizard_completed_at` ou `published`. 422 se publicar com unidade `available` sem `price_base`.

### Admin

| Método | Path |
|--------|------|
| GET/POST | `/api/admin/incc-indices` |
| PATCH | `/api/admin/incc-indices/{inccIndex}` |
| GET | `/api/admin/incc-indices/hint` — último INCC-M na API BCB (não grava) |
| GET/POST | `/api/admin/amenities` |
| PATCH | `/api/admin/amenities/{amenity}` — `active`, `name` |

### Job

`opim:fetch-incc` às `08:05` timezone `America/Sao_Paulo`.
Config: `opim.incc.bcb_series_id` (INCC-M). Se a competência retornada já existe → no-op. Falha de rede → log, exit 0 (não quebra o schedule).

## Frontend

- `BuildingWizardPage` em `/buildings/new` e `/buildings/:id/wizard` (retomada se `wizard_completed_at` null).
- Compound: `Wizard.Frame`, `Wizard.Step`, `BuildingMassing` (CSS 3D-flat clicável: torre → andar → unidade).
- Step 4: `BuildingMediaGallery` existente + textarea + botão IA + switch Rascunho (default ligado).
- Listagem: card de rascunho com CTA “Continuar cadastro”.
- Admin: páginas INCC (tabela competência/valor/origem) e Adicionais.

## Contratos / riscos de implementação

- Série BCB deve ser **INCC-M** (número-índice). Se a série for variação %, o job não grava e o admin insere o índice — validar na 1ª execução contra FGV.
- Códigos: `sprintf('%d%02d', floor, position)` → 101, 1001 no 10º.
- Andar com 0 unidades: **não permitir** no `unit-grid` (mínimo 1).
- IA: timeout curto, 422 amigável; chaves só em env (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPIM_LLM_PROVIDER`).
