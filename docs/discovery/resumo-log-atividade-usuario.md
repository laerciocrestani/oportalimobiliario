# Resumo do Entendimento — Log de atividade de usuário (auditoria)

## Problema e objetivo

Hoje o sistema registra o **fluxo da reserva** (timeline: etapas, ator, data), mas não o **comportamento da pessoa**. Em uma disputa (“quem cadastrou esse cliente?”, “quem mudou esse status?”, “o admin estava impersonando?”) não há trilha pessoal consultável nem exportável.

O objetivo é um log **append-only** das ações de corretor e de cada usuário da construtora (mutações + autenticação), para o próprio ator revisar o que fez, para o gestor da construtora auditar a **equipe**, e para o **admin SaaS** provar situações futuras (disputa comercial + compliance interno), inclusive por export CSV.

## Sistema existente

- Stack: Laravel API + React SPA multi-perfil; tenancy `tenant_id`; Sanctum; Spatie Permission (teams).
- Já existe `reservation_timeline_events` (append-only) — auditoria **da reserva**, não da pessoa. Permanece. O log de usuário é **complementar** e **também duplica** as transições de reserva no histórico da pessoa que as executou.
- Construtora tem permissões granulares (`buildings.view` … `team.manage`) atribuídas em `/team`. Nova permissão `audit.view` entra nesse catálogo.
- Corretor: 1 conta, N tenants; **sem** permissions Spatie; acesso por `building_access` / ownership.
- Admin: role `admin`, sem permissions granulares; já existe impersonate de tenant.
- Hard delete de pré-reserva hoje **não** deixa histórico na reserva; no log de usuário a ação de cancelar/criar pré-reserva **entra** (catálogo v1).
- Jobs (`expire-reservations`, expire pre-hold) **não** entram na v1 (não há ator humano).
- Portal público / www: fora da v1.
- O que **não** muda: timeline da reserva como meio comum entre corretor e construtora; construtora **não** passa a ver o log pessoal do corretor.

## Restrições organizacionais

- Mesmo time e monorepo; **prazo e orçamento não informados** (PREMISSA: entrega incremental, sem deadline externo).
- Sem ferramenta externa de SIEM/log na v1.

## Atores

- **Corretor:** vê somente o próprio log (conta individual, todas as ações que ele executou).
- **Usuário da construtora (sem `audit.view`):** vê somente o próprio log.
- **Gestor da construtora (com `audit.view`):** vê o próprio log e o de qualquer usuário da **equipe do tenant**; seleciona a pessoa e filtra por intervalo de datas. Não vê log de corretores.
- **Quem atribui `audit.view`:** quem já tem `team.manage` (mesmo fluxo de checkboxes da equipe). (PREMISSA)
- **Admin SaaS:** vê logs de todos (corretores, usuários builder, outros admins), em tela e por export CSV; não usa `audit.view`.
- **Cliente final / portal público:** não são atores deste log.

## Requisitos funcionais

1. Cada usuário autenticado (corretor, builder, admin) possui um log **pessoal**, só inserção, sem edição e sem exclusão.
2. Toda **mutação** do catálogo v1 gera um evento no log do ator.
3. Eventos de **login, logout e impersonate** (início/fim) geram evento.
4. Transições de reserva que já vão para o timeline **também** vão para o log da pessoa que as executou.
5. Corretor consulta o próprio histórico (PREMISSA: filtro por intervalo de datas; filtro opcional por construtora/tenant, porque a conta atua em N tenants).
6. Usuário builder consulta o próprio histórico com filtro por intervalo de datas.
7. Usuário com `audit.view` escolhe um membro da equipe (mesmo tenant) e vê o log daquela pessoa, filtro **somente por date range**.
8. Admin consulta logs de todos com filtros: período (início e fim), tenant, usuário, tipo de ação; exporta **CSV** sem limite de tamanho de período.
9. Cada evento traz frase humana em texto, com **valor antigo e valor novo** quando houver alteração.
10. Dados sensíveis (documento, telefone, valores) são **gravados completos**. Quem tem `audit.view` (e o admin) pode vê-los. O ator vê completo no **próprio** log. (PREMISSA sobre o próprio log)
11. Impersonate: a ação aparece **nos dois** logs — do admin e do usuário impersonado — com indicação explícita de quem operou em nome de quem.

## Requisitos não funcionais

- **Imutabilidade:** somente INSERT; sem UPDATE/DELETE de eventos (aplicação e API).
- **Retenção:** 5 anos; depois disso, purge (política a implementar; não “para sempre”).
- **Isolamento:** construtora só vê logs de usuários **builder daquele tenant**. Corretor não vê colegas. Construtora não vê corretor. Admin vê tudo.
- **LGPD:** retenção longa + PII completo é decisão de produto para auditoria; acesso a PII de terceiros restrito a `audit.view` e admin. Direito de exclusão do titular **conflita** com trilha imutável de 5 anos — ver riscos.
- **Export:** CSV pode cobrir 5 anos e todos os tenants; volume alto é aceito na regra de negócio. (PREMISSA técnica posterior: geração pode ser síncrona ou assíncrona; não bloqueia o entendimento.)
- **Idioma:** frases do log persistidas em **PT-BR** (auditoria e CSV legíveis sem o app). (PREMISSA)
- **Consultar o log não gera evento** (leituras fora da v1).

## Regras de negócio

- Log é da **pessoa**, não um feed único da construtora.
- `audit.view` ≠ `team.manage`: gerenciar equipe não implica auditar; auditar não implica gerenciar equipe.
- Meio comum corretor ↔ construtora continua sendo a **reserva/timeline**. O log do corretor é privado (corretor + admin).
- Catálogo v1 **corretor:** CRUD cliente; criar/cancelar/confirmar pré-reserva e reserva; enviar proposta, comprovante, dados de contrato, mensagens; login/logout.
- Catálogo v1 **construtora:** CRUD empreendimento/torre/unidade; status de unidade; convites e acesso de corretores; decisões de reserva (aceitar/recusar/devolver proposta, aprovar sinal, emitir contrato, cancelar); CRUD equipe; login/logout.
- Catálogo v1 **admin:** login/logout; impersonate start/stop; CRUD de tenants; e qualquer mutação feita **durante** impersonate (duplicada no log da vítima).
- Fora da v1: visualizações, downloads, jobs automáticos, portal público.
- **Anexos:** o log guarda metadados (id, nome, tipo, ação), **não** o binário do arquivo. Números de documento, telefone e valores entram na frase em texto completo. (PREMISSA)
- Usuário desativado ou removido da equipe: eventos **permanecem** até os 5 anos; quem tem `audit.view` ainda seleciona ex-membros para consulta. (PREMISSA)
- Login com senha inválida: **entra** no log (e-mail tentado + falha), para investigação de uso indevido. (PREMISSA)

## Fluxos principais

1. **Escrita:** usuário autentica ou altera um recurso do catálogo → sistema insere um evento no log daquele `user_id` (tenant quando couber) com frase, antes/depois, recurso, timestamp, e se houver impersonate, ids do admin e do impersonado.
2. **Corretor lê:** abre a tela de atividade → lista os próprios eventos; filtra datas (e opcionalmente tenant).
3. **Builder lê o próprio:** idem, sem seletor de pessoa.
4. **Gestor audita equipe:** com `audit.view`, escolhe o usuário da equipe → date range → lista eventos daquela pessoa (PII completo).
5. **Admin audita / exporta:** filtra tenant, usuário, tipo, início e fim → visualiza ou baixa CSV com as mesmas frases humanas.
6. **Impersonate:** admin inicia impersonate (evento nos dois lados) → mutações seguintes saem nos dois logs com marca de delegação → fim do impersonate também registrado.
7. **Expiração automática de reserva:** não gera log de usuário; o timeline da reserva permanece a fonte desse fato.

## Integrações externas

- Nenhuma na v1. Sem SIEM, e-mail de alerta ou webhook de auditoria.

## Restrições e premissas

- Append-only de verdade: nem o admin apaga evento pela API do produto.
- Duplicação consciente timeline + log da pessoa.
- Frase humana no banco, não só código de evento (código interno pode existir para filtro; o texto é a fonte da auditoria).
- Tela dedicada por portal (item de navegação), não um modal dentro do perfil. (PREMISSA de UX)
- Sem prazo externo informado.
- Premissas marcadas acima: filtro tenant no corretor; próprio log com PII completo; metadados de anexo sem binário; ex-membros visíveis; login falho registrado; frases em PT-BR; `team.manage` atribui `audit.view`.

## Riscos identificados

- **Dois registros da mesma transição de reserva** (timeline vs log da pessoa): risco de divergência se um caminho de código gravar só um. Mitigação: mesmo ponto de escrita da mutação emitir os dois; testes cobrindo ambos. Pendente de desenho.
- **PII completo por 5 anos** + `audit.view` na equipe: superfície ampla (CPF, telefone, valores). Mitigação de processo: `audit.view` só para poucos gestores. Mitigação legal: política de acesso e revisão LGPD (retenção vs minimização) — **pendente de aceite consciente**.
- **Export CSV sem limite de período:** timeout, memória, download enorme. Mitigação técnica (pós-confirmação): export assíncrono / streaming; não muda a regra “sem teto de datas”.
- **Login falho em volume** (brute force): infla a tabela. Mitigação: rate limit de auth já existente + retenção igual; aceitar volume.
- **Hard delete de pré-reserva** vs log: a reserva some, o evento da pessoa fica. Consulta posterior pode apontar para recurso inexistente — esperado; guardar ids e labels na frase.

## Lacunas / decisões pendentes

- Prioridade relativa ao trabalho atual de reservation-timeline / contratos (agora vs backlog).
- Nome do item de menu / rota (ex.: “Atividade”, “Meu histórico”) — cosmética, não bloqueia.
- Confirmar as **premissas** (login falho, ex-membros, filtro tenant no corretor, anexos só metadados, tela dedicada).
- Revisão explícita do conflito LGPD (exclusão do titular vs trilha de 5 anos): na v1 a trilha **vence** (não apaga a pedido do usuário autenticado no produto). Confirmar.

---
**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
