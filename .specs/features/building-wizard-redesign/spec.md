---
branch: feature/building-wizard-floor-stack
status: done
depends_on: building-wizard, buildings, tenancy, auth
source: docs/discovery/resumo-redesenho-wizard-empreendimentos.md
---

# Feature: redesenho do wizard de empreendimentos

## Objetivo

Redesenhar os steps do wizard de criação de empreendimentos com UX **híbrida** (perguntas guiadas geram o esqueleto do prédio + **editor visual em pilha de andares** para espelho, clonagem por faixa, exceções e garagens). Enxugar os campos por unidade e adicionar suporte a **subsolos de garagem** (andares negativos) e **térreo (andar 0)** com lojas comerciais. As regras da feature `building-wizard` (INCC-M, ViaCEP, adicionais, IA, herança, rascunho por step) permanecem.

## Requisitos

- `REQ-WZR-001`: Wizard reduzido para **3 steps**: (1) Identidade+endereço, (2) **Estrutura** (torres, andares, subsolos, espelho/clonagem, vagas), (3) Mídia+descritivo+publicar. Só no fluxo de **criação**.
- `REQ-WZR-002`: `floors.number` passa a aceitar **0 e negativos**. Térreo = **andar 0** (pode conter lojas comerciais); acima gera `101…`; subsolos = negativos (`-1`, `-2`, …).
- `REQ-WZR-003`: `FloorKind` ganha o valor **`garage`**. Tipo é do andar inteiro: `residential` (padrão) | `commercial` | `garage`.
- `REQ-WZR-004`: **Andar-espelho + clonagem por faixa**: preencher um andar de referência (unidades com metragens diferentes) e clonar para uma **faixa escolhida**, acima ou abaixo do andar de referência.
- `REQ-WZR-005`: **Exceções preservadas**: reclonar **não sobrescreve** andares marcados como editados manualmente (`floors.customized = true`); só recria os não tocados.
- `REQ-WZR-006`: **Vaga = `unit`** em andar `kind='garage'`, com **área** e **preço-base + competência** (mesma regra INCC-M das unidades). O wizard cria o **inventário** de vagas por subsolo.
- `REQ-WZR-007`: Campos da unidade no wizard **enxutos**: `code`, `private_area_m2`, `bedrooms`, `bathrooms`, `price_base`, `price_competence`. Ficha completa (suítes, lavabos, sacadas, solar, sol, posição, forro, aberturas, piso, adicionais) e defaults de herança do empreendimento migram para a **edição pós-criação**.
- `REQ-WZR-008`: **Editor visual em pilha** substitui `BuildingMassing` (topo→base, incl. subsolos; clicável; badges de tipo e exceção).
- `REQ-WZR-009`: Persistência **por step** e rascunho retomável (`published=false`) mantidos; `wizard_step` passa a 1–3.
- `REQ-WZR-010`: Validações: mínimo 1 unidade por andar; ao publicar, unidades/vagas `available` exigem preço (bloqueio 422); `PUT structure`/`unit-grid` só em rascunho (409 se publicado).
- `REQ-WZR-011`: Feature tests Pest (structure/unit-grid com garagem/0/negativos e `customized`), OpenAPI atualizado e Vitest do novo editor (skeleton, stack, espelho/clonagem, exceção, vagas).

## Fora desta fatia

- **Vínculo vaga↔unidade na reserva** (uma unidade com 1+ vagas): responsabilidade da feature de **reservas**. Aqui só nasce o inventário de vagas.
- Reabrir o wizard para empreendimento já publicado (edição segue nas telas de detalhe estendidas).
- Migrar/renumerar empreendimentos existentes para o novo esquema (andar 0). Dados atuais permanecem intactos; o esquema novo vale para **novos** cadastros.
- Ficha completa e defaults de herança dentro do wizard (movidos para edição pós-criação).
