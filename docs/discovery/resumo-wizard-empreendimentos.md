# Resumo do Entendimento — Wizard de criação de empreendimentos

## Problema e objetivo

Hoje a construtora cria empreendimento só com o **nome**. Torres não têm quantidade de andares; unidades entram uma a uma (código, andar, uma área, preço). Isso não escala: um prédio típico gera dezenas ou centenas de unidades.

O objetivo é um **wizard de criação** que injete estrutura de uma vez — nome, endereço, torres, andares, unidades, mídia e descritivo — com planta típica replicável e exceção por andar, persistindo **a cada step** para o gestor poder parar e retomar. No último step, um switch **Rascunho** decide se o empreendimento permanece draft ou é salvo (publicado). O wizard **não** substitui a edição posterior; só o create.

## Sistema existente

- Portal construtora: `POST` simples em `/buildings` (nome + `published: false`); edição em `/buildings/:id/edit` (nome, slug, cidade, UF, SEO, publicado).
- Modelos atuais: `Building` (sem endereço completo), `Tower` (nome + `sort_order`, sem andares), `Unit` (`code`, `floor`, `area_m2`, `price`, `status`).
- Mídia já existe: `BuildingMedia` com categorias `internal`, `external`, `floor_plan`.
- Status de unidade já inclui `available`, `reserved`, `sold` (e outros). Venda (`sold`) ocorre na timeline quando o gestor valida o contrato (`REQ-RTL-022`).
- Permissão: `buildings.manage`.
- Não existe ViaCEP, INCC, adicionais, tipo comercial/residencial, áreas privativa/total, ficha de tipologias nem geração de descritivo por IA.
- Stack: Laravel API + React SPA (shadcn) + PostgreSQL; tenancy `tenant_id`. **Não pode mudar.**
- Portal admin hoje só gerencia tenants; passará a ter INCC (CRUD da tabela) e catálogo de adicionais.
- Scheduler Laravel já existe (`routes/console.php`) — o job **diário** de INCC-M entra aí.

## Restrições organizacionais

- Mesmo time e monorepo; sem prazo/orçamento explícitos nesta descoberta.
- Entrega incremental: wizard de create primeiro; telas de edição atuais passam a cobrir os novos campos depois do create (não reabrir o wizard para empreendimento já salvo/publicado).

## Atores

- **Gestor da construtora** (`buildings.manage`): conduz o wizard; escolhe adicionais do catálogo; informa preços; gera descritivo com IA; no último step marca rascunho ou salva; na emissão do contrato pode alterar o valor final em R$.
- **Admin do SaaS**: mantém a **tabela de INCC-M** (edita qualquer linha gerada pelo job ou criada na mão) e o **catálogo fechado de adicionais**. Construtora **não** cria adicional. A API do BCB **não** alimenta preço de unidade — só ajuda o admin (e o job) a saber o valor vigente para gravar no banco.
- **Corretor**: não usa o wizard; consome empreendimento/unidades já cadastrados (preço final INCC, atributos, adicionais).
- **Portal público**: só vê empreendimento quando `published = true` (switch rascunho desligado no último step, ou publicação posterior na edição).

## Requisitos funcionais

1. Substituir o create atual (campo nome) por wizard em **4 steps**, só no fluxo de **criação**.
2. **Step 1 — Identidade e endereço:** nome; CEP com busca ViaCEP; logradouro, bairro, cidade, UF preenchidos; número e complemento manuais; fallback manual se ViaCEP falhar. Persiste rascunho.
3. **Step 2 — Torres:** quantidade de torres; cada torre com nome e quantidade de andares **independente**. Visual do prédio em CSS (profundidade flat), **clicável**. Persiste rascunho.
4. **Step 3 — Unidades:** definir planta típica do andar (N unidades, ex. 4 ou 5) e **replicar** em todos os andares da torre. Numeração gerada `101…105`, `201…` (andar + posição), **editável**.
5. Exceção de planta: se o gestor **remover** uma unidade de um andar, **redesenha o andar inteiro** (ex.: 10 andares com 4 unidades, 9º e 10º com 3).
6. Tipo do andar: **andar inteiro** residencial (padrão) ou comercial. Neste momento o tipo **não muda campos**, só a classificação.
7. Ficha da unidade (obrigatória no modelo; valores podem faltar no wizard): preço, área privativa, área total, banheiros, suítes, quartos, lavabos, sacadas, posição solar, período de sol, posição do imóvel (esquina / frente / fundos), tipo de forro, tipo de aberturas, tipo de piso.
8. O que for comum **herda do empreendimento** (não precisa repetir por unidade). Unidade **não desliga** adicional do prédio. Adicionais extras da unidade são **somados** aos do empreendimento.
9. Adicionais: catálogo **fechado**, mantido só pelo **admin**. Construtora apenas seleciona: conjunto do empreendimento e conjunto por unidade (ex.: água quente, rebaixo em gesso, sacada fechada).
10. Preço **sempre em INCC**. A base de todas as unidades é o índice. Se o INCC **cair**, o valor em R$ de **todas** as unidades à venda/reservadas **cai**. Não há preço fixo neste fluxo. Unidades podem ser salvas **sem valor** no wizard.
11. **Step 4 — Mídia e descritivo:** mídia **externa** e **interna** (`BuildingMedia` já existente); descritivo do empreendimento (`description`); botão **Gerar descrição com IA** (Gemini e GPT implementados no código da API). No mesmo step: **switch/checkbox Rascunho**.
12. Steps 1–3 (e o 4 enquanto rascunho) persistem no servidor. No **final**, o gestor deixa **Rascunho ligado** (continua `published = false`, pode retomar) ou **desliga e salva** (`published = true`).
13. Visual: prédio CSS com profundidade, simples, interativo (clique em torre/andar/unidade nos steps 2 e 3). Sem Three.js/WebGL nesta fatia.

## Requisitos não funcionais

- Persistência **por step** no servidor (não só estado local): retomar em outro momento/dispositivo.
- ViaCEP sem SLA: timeout + preenchimento manual; não bloquear o step.
- Volume alvo: dezenas a centenas de unidades geradas de uma vez (ex. 3 torres × 20 andares × 4 unidades) sem cadastro unitário.
- **Cálculo de preço lê somente o banco.** Nenhuma listagem de unidade chama BCB/FGV em runtime.
- INCC e catálogo de adicionais são **globais** da plataforma (admin); empreendimentos/unidades isolados por `tenant_id`.
- Job **diário de INCC-M às 08:05** (timezone `America/Sao_Paulo`) no scheduler Laravel.
- IA: chamada server-side; chaves **só em env/secrets**, nunca commitadas. Integração Gemini e GPT **no código** (não ferramenta externa no-code). Construtora não escolhe provedor — o backend usa o configurado.
- LGPD: endereço do empreendimento é dado cadastral do ativo, não de pessoa física. Prompt de IA envia só dados do empreendimento (nome, endereço, tipologias), sem PII de clientes.

## Regras de negócio

- Wizard = create. Rascunho incompleto **retoma o wizard**. Depois de salvar com rascunho desligado, alterações nas telas atuais de detalhe/edição (estendidas).
- Planta típica replica; exceção = remover unidade e redesenhar **só aquele andar**.
- Andar comercial ou residencial como bloco; mistura no mesmo andar **fora do caso normal** (não é requisito agora).
- Térreo inicia a numeração como **andar 1** (`101…`).
- **INCC — índice:** **INCC-M** (não INCC-DI). Fonte da verdade: tabela no banco (mês/ano + valor). Toda correção de preço usa essa tabela.
- **INCC — divulgação (regra de produto):** o INCC-M do **próprio mês de referência** sai no **fim desse mês**, por volta das **8h**, em dia variável. Exemplos: julho/2026 divulgado em 28/07/2026; agosto/2026 previsto para 26/08/2026 às 8h. Por isso **não** há job no dia 1.
- **INCC — job diário 08:05:** consulta o helper (BCB/SGS ou equivalente) **todo dia às 08:05**. Se aparecer competência nova ainda **não** gravada, **insere** a linha. Se a competência já existe, **não sobrescreve** (preserva edição do admin). Se a API ainda não tiver o mês novo, o job não faz nada; o vigente continua o **último preenchido**. Admin pode editar qualquer linha depois.
- **INCC — UI admin:** a API é **helper** (“valor vigente sugerido”); gravar/editar é sempre no banco. Admin pode criar/editar qualquer competência.
- **INCC — cálculo (premissa):** unidade guarda **preço-base em R$** + **competência**. Valor final = `preço_base × (INCC-M_vigente / INCC-M_da_competência)`, com vigente = último registro **preenchido** na tabela. Índice cai → R$ cai.
- Unidade `available` e `reserved`: preço final **continua recalculando** (inclusive para baixo).
- Na **emissão do contrato**, a construtora pode **alterar o valor final em R$**. Esse valor é o que segue no contrato; a venda (`sold`) usa esse montante congelado.
- Unidade sem preço: permitida enquanto **rascunho**; **premissa:** não dá para desligar rascunho / publicar se houver unidade à venda sem preço.
- Adicional do prédio aplica a todas as unidades; unidade não remove. Adicional só da unidade é extra.
- Construtora não cria, edita nem exclui itens do catálogo de adicionais.
- Gerar descritivo com IA **não publica** sozinho; o texto cai no campo, o gestor edita e segue o switch de rascunho.

## Fluxos principais

1. Gestor clica em novo empreendimento → Step 1 (nome + CEP/endereço) → persiste rascunho.
2. Step 2: N torres e andares por torre; interage com o prédio CSS; persiste.
3. Step 3: planta típica; grade gerada `101…`; exceções redesenham o andar; defaults e adicionais; preços opcionais; persiste.
4. Step 4: upload mídia externa e interna; descritivo manual e/ou botão IA; switch **Rascunho**.
5. Rascunho ligado → sai e retoma o wizard depois. Rascunho desligado → salva publicado (com validação).
6. **Todo dia às 08:05:** job tenta obter o INCC-M mais recente. Se for um mês ainda inexistente na tabela, insere. Admin revisa/edita no portal admin.
7. Listagens de unidades à venda/reservadas recalculam R$ a partir da tabela INCC (sobe ou desce com o índice).
8. Na emissão do contrato, gestor confirma ou altera o R$ final → valor do contrato; ao marcar vendida, permanece esse R$.

### Alternativos / erros

- ViaCEP indisponível ou CEP inválido → endereço manual.
- BCB indisponível ou INCC-M ainda não divulgado → job não cria/altera linha; unidades continuam no último INCC-M preenchido; admin pode inserir na mão.
- IA indisponível → descritivo só manual; wizard não trava.
- Remover a última unidade de um andar → **lacuna** (andar vazio permitido ou não).
- Tentar publicar (rascunho off) com unidade sem preço → bloqueado (premissa).

## Integrações externas

- **ViaCEP** (`https://viacep.com.br/`): busca endereço por CEP. Sem autenticação, sem SLA.
- **BCB SGS (ou fonte equivalente de INCC-M):** helper do job 08:05 e da tela admin. **Nunca** é lido no cálculo de unidade. Série a mapear para **INCC-M** (não INCC-DI / série 192 genérica, se divergirem).
- **LLM (Gemini e GPT):** geração do descritivo no step 4, chamada no backend. Sem API FGV paga nesta fatia.

## Restrições e premissas

- Pedido original “preço fixo **ou** INCC”: **não entra**. Base sempre INCC; preço em R$ flutua com o índice (para cima e para baixo).
- Gestor **digita o preço em R$** na competência; o sistema deriva o valor final com o índice. Não é digitação de “quantidade de INCC” — premissa.
- Admin/job gravam o **valor do índice INCC-M** do mês (número da razão vigente/base), não só a variação % avulsa — premissa.
- **Calendário:** divulgação no fim do mês de referência (~26–28, 8h). Job diário 08:05 pega o número no mesmo dia da divulgação (ou no dia seguinte se a API atrasar). Timezone: `America/Sao_Paulo`.
- Job **só insere competência nova**; não sobrescreve linha existente (admin é soberano) — premissa.
- Campos de herança do empreendimento: forro, aberturas, piso e adicionais do prédio. Sempre da unidade: preço, áreas, quartos/banheiros/suítes/lavabos/sacadas, posição do imóvel. Posição solar e período de sol: default no empreendimento, ajustáveis na unidade — premissa.
- Step 4 usa categorias já existentes `internal` e `external`. Planta (`floor_plan`) **não** é obrigatória neste step — premissa.
- SEO (`seo_title` / `seo_description`) pode permanecer na edição posterior; o wizard cobre o **descritivo** (`description`).
- Switch rascunho = flag `published` (`true` só com rascunho desligado).
- Visual CSS clicável nos steps 2 e 3; steps 1 e 4 sem prédio 3D.
- Provedor de IA: Gemini e GPT no código; qual motor atende o botão é **config do servidor** (env), não escolha da construtora — premissa.
- Corretor e portal público vêem os novos atributos quando o empreendimento estiver acessível/publicado — detalhe de UI depois.

## Riscos identificados

- **API atrasar além das 08:05 no dia da divulgação:** mitigação — o job do dia seguinte insere; preços ficam um dia no INCC-M anterior.
- **Série BCB ≠ INCC-M de contrato:** mitigação — índice alvo é INCC-M; admin edita a linha se o helper vier errado.
- **INCC em queda:** comportamento pedido (preços caem). Risco comercial se o índice recuar; não há piso nesta fatia.
- **ViaCEP / LLM fora do ar:** wizard segue na mão.
- **Geração em massa:** bulk em transação única; evitar N POSTs.
- **Contrato vs. tabela INCC:** override em R$ na emissão precisa ficar explícito na reserva.
- **Custo/abuso de IA:** botão autenticado, `buildings.manage`; rate limit por tenant — premissa de implementação.
- **Rascunhos incompletos:** listagem precisa de “continuar cadastro”.
- **Chaves de LLM:** somente env/secrets (mesmo com a integração “no código”).

## Lacunas / decisões pendentes

Fechadas na arquitetura (`.specs/features/building-wizard/design.md`): preço em R$; índice absoluto; andar com 0 unidades **bloqueado**; publicar sem preço **bloqueado**; job com falha = log; step 4 só interna/externa; LLM via `OPIM_LLM_PROVIDER` (default Gemini).

Ainda aberto na implementação: código exato da série BCB do INCC-M (validar na 1ª execução do job).

---

**Status:** aprovado em 2026-08-19. Arquitetura em `.specs/features/building-wizard/`.
