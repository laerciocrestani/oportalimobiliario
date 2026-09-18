# Resumo do Entendimento — Redesenho do Wizard de Empreendimentos

> Sucede a `docs/discovery/resumo-wizard-empreendimentos.md` (feature original, já entregue).
> Esta descoberta trata do **redesenho completo** do wizard, motivado por UX insatisfatória e por regras de negócio não cobertas (garagem/subsolo e andar-espelho com clonagem por faixa).

## Problema e objetivo

O wizard atual (4 steps: identidade+endereço → torres+andares → unidades → mídia) está insatisfatório em todos os pontos avaliados: o modelo de "planta típica" replica a mesma área em todos os andares (não representa andar-espelho), não suporta garagem/subsolo, não permite clonar um andar de referência para uma faixa, concentra campos demais numa tela só, o visual do prédio (massing CSS) agrega pouco e a persistência incomoda.

Objetivo: **redesenhar os 4 steps** com UX **híbrida** (perguntas guiadas geram o esqueleto do prédio + **editor visual em pilha/tabela de andares** para espelho, clonagem, exceções e garagens), reduzindo os campos por unidade ao essencial e adicionando suporte a subsolos de garagem. As regras de negócio da feature original (INCC-M, ViaCEP, adicionais, IA, herança) permanecem.

## Sistema existente

- Wizard implementado em `frontend/src/apps/builder/BuildingWizardPage.tsx` + componentes `BuildingWizard*` e `BuildingMassing`; lib de grade em `frontend/src/apps/builder/lib/unit-grid.ts`.
- Backend: `buildings` (endereço, defaults, `wizard_step`), `towers` (`floors_count`), `floors` (`tower_id`, `number` 1..N, `kind` residential|commercial, unique `tower_id`+`number`), `units` (`floor_id`, áreas privativa/total, ficha, `price_base`+`price_competence`).
- Preço calculado na leitura via `UnitPriceCalculator` a partir da tabela `incc_indices` (global). Endpoints por step: `POST/PATCH buildings`, `PUT .../structure`, `PUT .../unit-grid`, `POST .../generate-description`, `GET /builder/cep/{cep}`, `GET /builder/amenities`.
- Persistência por step com rascunho (`published=false`) já existe.
- Stack: Laravel API + React SPA (shadcn) + PostgreSQL; tenancy por `tenant_id`. **Não muda.**
- Restrição estrutural: hoje `floors.number` é 1..N positivo — não há andar 0 nem negativo.

## Restrições organizacionais

- Mesmo time e monorepo; sem prazo/orçamento explícitos.
- Compatibilidade com empreendimentos já cadastrados no modelo atual (não quebrar dados existentes na migração de andar 0/negativos).

## Atores

- **Gestor da construtora** (`buildings.manage`): conduz o wizard; define torres, andares (incl. subsolos de garagem), andar-espelho e clonagem; informa áreas e preço-base INCC; seleciona adicionais; gera descritivo com IA; publica ou mantém rascunho.
- **Admin do SaaS**: mantém tabela INCC-M e catálogo de adicionais (inalterado).
- **Corretor / Portal público**: consomem preço calculado e atributos (inalterado).

## Requisitos funcionais

1. Redesenhar os **4 steps** do wizard (fluxo de criação), com UX **híbrida**: perguntas guiadas para gerar o esqueleto + **editor visual em pilha de andares** (substitui o massing CSS) para espelho/clonagem/exceções/garagens.
2. **Estrutura:** N torres; cada torre com quantidade de andares independente. Suporte a **subsolos de garagem** como andares negativos (`-1`, `-2`, …) com tipo `garage`.
3. **Numeração:** térreo = **andar 0** (pode conter **lojas comerciais**); 1º andar acima gera `101…`; subsolos negativos usam prefixo próprio para vagas (ex.: `S1`/`V1`) — formato exato a definir no design.
4. **Andar-espelho + clonagem por faixa:** o gestor preenche **um andar de referência** com unidades de metragens diferentes (ex.: 201=50 m², 202=44,90 m², 203=43,8 m²) e **clona para uma faixa escolhida**, acima ou abaixo do andar de referência.
5. **Exceções preservadas:** ao reclonar, andares já editados manualmente (exceção) **não são sobrescritos**; só andares não tocados recebem a cópia.
6. **Tipo do andar** como bloco: `residential` (padrão), `commercial` ou `garage`.
7. **Campos da unidade no wizard (enxutos):** código, **área privativa**, **quartos**, **banheiros**, **preço-base + competência** (INCC-M). A ficha completa (suítes, lavabos, sacadas, posição solar, período de sol, posição do imóvel, forro, aberturas, piso, adicionais) migra para a **edição pós-criação**.
8. **Garagem (inventário):** cada vaga tem **área (m²)** e **preço**, corrigido pela **mesma regra INCC-M** das unidades. O wizard cria o **inventário** de vagas por subsolo.
9. **Herança de defaults do empreendimento** permanece (forro, aberturas, piso, solar/sol, adicionais do prédio).
10. Mantém: endereço via **ViaCEP** com fallback manual; **descritivo com IA**; switch **Rascunho** no fim; **persistência por step** e retomada.

## Requisitos não funcionais

- Persistência por step no servidor + rascunho retomável (mantido).
- Editor em pilha precisa lidar bem com muitos andares (ex.: 30+) — clareza e performance.
- Cálculo de preço lê **somente o banco** (INCC), tanto para unidade quanto para vaga.
- ViaCEP e IA sem SLA: não bloquear o fluxo.

## Regras de negócio

- Wizard = criação; edição posterior nas telas de detalhe (estendidas).
- Andar-espelho replica por **faixa** (acima/abaixo), não obrigatoriamente todos os andares. Reclonar **preserva exceções**.
- Térreo = andar 0 (pode ter lojas comerciais); subsolos negativos = garagem.
- Preço (unidade e vaga) **sempre INCC-M**: `base × (INCC_vigente / INCC_competência)`; recalcula para `available`/`reserved`; congela na emissão do contrato.
- Adicionais: catálogo fechado do admin; construtora só seleciona; herança do prédio não é desligável pela unidade.
- **Venda da vaga ocorre atrelada à reserva de uma unidade**: uma unidade pode ter **1 ou mais vagas** na reserva. O **vínculo** vaga↔unidade é responsabilidade da **feature de reservas** (fora deste wizard); aqui só nasce o **inventário** de vagas.

## Fluxos principais

1. Gestor inicia novo empreendimento → identidade + endereço (ViaCEP) → persiste rascunho.
2. Define torres e, por torre, andares — incluindo **subsolos de garagem** (negativos) e possíveis lojas no térreo (andar 0).
3. Em cada torre, preenche **um andar-espelho** (unidades + área + quartos/banheiros + preço) e **clona para a faixa** desejada (acima/abaixo). Ajusta exceções em andares específicos.
4. Define **vagas** por subsolo (área + preço INCC).
5. Mídia interna/externa + descritivo (manual/IA) + switch Rascunho.
6. Rascunho ligado → retoma depois; desligado → publica (validação: sem unidade à venda sem preço).

### Alternativos / erros

- ViaCEP/IA indisponível → segue manual.
- Reclonar sobre andar-exceção → não sobrescreve.
- Publicar com unidade à venda sem preço → bloqueado.

## Integrações externas

- **ViaCEP**: endereço por CEP (mantido).
- **BCB/SGS (INCC-M)**: helper do job/admin; nunca lido em runtime (mantido).
- **LLM (Gemini/GPT)**: descritivo no step de mídia (mantido).

## Restrições e premissas

- **PREMISSA:** numeração — térreo = andar 0; acima `101…`; subsolos negativos com prefixo de vaga (ex.: `S1`/`V1`); formato final definido no design.
- **PREMISSA:** preço da vaga usa a **mesma** tabela INCC-M (base + competência).
- **PREMISSA:** vínculo vaga↔unidade na reserva **não** entra neste wizard; o inventário de vagas nasce aqui (se uma coluna/pivô de vínculo já deve nascer agora, decidir no design).
- **PREMISSA:** ficha completa da unidade sai do wizard e vai para a edição pós-criação; o wizard grava apenas os campos enxutos (área privativa, quartos, banheiros, preço).
- Editor visual em **pilha/tabela** substitui o massing CSS clicável.
- Regras da feature original (INCC, ViaCEP, adicionais, IA, herança, rascunho por step) **inalteradas**.

## Riscos identificados

- **Modelo de dados:** introduzir andar 0 e negativos muda a semântica de `floors.number` (hoje 1..N) e o unique/backfill; risco de quebrar dados existentes — mitigar com migração cuidadosa e testes de compatibilidade.
- **Fronteira com reservas:** garagem vendida via reserva de unidade (1+ vagas) impacta a feature de reservas; o contrato "inventário aqui, vínculo lá" precisa ficar explícito para evitar retrabalho.
- **Preserve na clonagem:** exige marcar "andar editado/exceção" no estado e na persistência para não sobrescrever ao reclonar.
- **Editor em pilha com muitos andares:** UX/performance para 30+ andares.
- **shadcn base questionnaire:** como optamos por híbrido (perguntas + editor), o componente de questionário do registro `base` não é bloqueante; verificar disponibilidade no `components.json` se for usado.

## Lacunas / decisões pendentes

- Formato exato de numeração de subsolo/vagas e do andar 0 (lojas).
- Se nasce agora uma coluna/pivô para o vínculo vaga↔unidade ou se fica 100% na feature de reservas.
- Como o backend marca um andar como "exceção" para o preserve funcionar.
- Quantos steps terá o novo wizard e como a parte guiada se conecta ao editor em pilha (decisão de arquitetura).

---
**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
