# Resumo do Entendimento — Andamento da Reserva flexível (timeline destravado + Kanban)

> Descoberta conduzida como Staff+ (skill `staff-architect-discovery`). 3 rodadas de perguntas.
> **Status: confirmado em 2026-09-17.** Branch `feature/reservation-progress-flex`. Entregas fatiadas em `.specs/features/reservation-progress-flex/`.

## Problema e objetivo

Hoje a reserva usa uma **timeline linear e travada**: 13 etapas em ordem fixa, `stage` acoplado a `unit.status`, máquina de estados rígida. O negócio precisa de um **andamento flexível ("liberdade guiada")**: as etapas iniciais viram opcionais e reordenáveis (o cliente pode comprar sem depender do sinal, e a proposta assinada é opcional), mantendo apenas **invariantes mínimas** para não gerar estado inconsistente. Além disso, muda o **layout** (de _sheet_ à direita para um **dialog central grande** com toda a linha da reserva) e adiciona-se uma **visão Kanban** de reservas (colunas = situações).

## Sistema existente

- **Timeline linear**: `ReservationTimelineService` (13 steps fixos), `ReservationStatus`/`stage`, `reservation_timeline_events` (append-only), `reservation_attachments` (por `kind`), `ReservationProposal` (versionado).
- **Contratos**: já existe CRUD de **templates de contrato** (`builder-contracts`, permissão `contracts.manage`) + emissão de PDF na reserva (Markdown → DomPDF). **Não** existe template de proposta.
- **Sinal**: janela de 48h **obrigatória** no fluxo atual (`deposit_window`).
- **Sem** testemunhas, **sem** Kanban, **sem** admin de propostas.
- **Sem infraestrutura de notificações** (só `User` é `Notifiable`); existe _activity log_.
- Papéis: `admin`, `builder` (permissões granulares em `BuilderPermissions`), `broker` (ownership + `building_access`). Layout atual: _sheet_ à direita (`ReservationTimelineSheet`).

## Restrições organizacionais

- Entrega incremental no monorepo atual (Laravel API + React SPA + shadcn). Sem prazo/orçamento informado.
- Sem integração de assinatura digital (gov.br) nesta entrega.

## Atores

- **Corretor** (`broker`): dono da reserva; envia proposta, devolve proposta assinada + sinal, insere contrato assinado pelo comprador.
- **Gestor da construtora** (`builder` com `reservations.cancel`): decide proposta, formaliza (upload do PDF assinado pela construtora), assina contrato pela construtora, confere e marca a unidade como **vendida**.
- **Testemunhas** (membros da **equipe da construtora**, usuários `builder` do mesmo tenant): escolhidas por reserva no contrato; recebem aviso e **registram a própria assinatura** no sistema.
- **Cliente/Comprador**: não usa o sistema (assina PDFs fora e devolve ao corretor).
- **[Fase 2 — fora desta entrega]** Vendedor da própria construtora (venda direta): usuário com permissão de vendedor.

## Requisitos funcionais

### Modelo de andamento (liberdade guiada)
1. As **fases iniciais** (pré-reserva, diálogo, proposta, sinal, documentação) tornam-se **opcionais e reordenáveis**; a **fase de contrato é sequencial guiada**.
2. **Sinal opcional**, definido **por reserva** (gestor/corretor marcam se há sinal e o valor).
3. **Proposta assinada opcional**: pode-se chegar ao contrato sem proposta assinada por ambas as partes.
4. **Invariante de venda**: só o **gestor confirma** a venda e **exige o contrato com todas as assinaturas** anexado (comprador + construtora + testemunhas) para marcar `sold`.
5. **Prazo da pré-reserva (48h)**: ao entrar em pré-reserva/diálogo há **janela de 48h**. A reserva **cai automaticamente** (unit → `available`, reserva expirada, **sem** ação do gestor) se ficar **parada** nessa fase, sem sinal e sem avanço. Ela **sobrevive** se: (a) o corretor **lançar o sinal** → promove para **Reservado**; (b) **avançar** (envio de proposta / início de contrato também seguram a reserva); ou (c) o **gestor estender/renovar** o prazo (quantas vezes quiser, ex.: +48h mesmo faltando poucas horas). O gestor também pode **forçar a queda** antecipada. **Não** existe ação separada "aceitar pré-reserva → Reservado": a promoção a Reservado vem do **lançamento do sinal**. A decisão de proposta é uma ação **distinta**, mais adiante. (Este 48h substitui a antiga janela de 48h do sinal.)

### Admin de propostas
6. Novo módulo **"Propostas"** com **CRUD de templates de proposta** (espelhando o CRUD de contratos), com permissão nova **`proposals.manage`**.
7. Na reserva, o sistema **gera o PDF da proposta** a partir do template.

### Formalização da proposta
8. Corretor envia a proposta; gestor decide (`accepted`/`rejected`/`returned`).
9. No **aceite**, o gestor faz **upload do PDF da proposta assinado pela construtora**.
10. Corretor leva ao comprador; comprador assina; corretor **devolve num único envio**: PDF assinado por **ambas as partes** + **comprovante do sinal** (quando houver).

### Contrato (sequencial guiado)
11. Comprador assina → corretor insere no sistema → construtora assina → **testemunha 1** avisada, assina → **testemunha 2** avisada, assina → gestor avisado → gestor **confere e marca vendida** → corretor avisado.
12. Testemunhas escolhidas por reserva entre a equipe da construtora; assinatura registrada no sistema (sem integração externa).

### Kanban + Dialog central
13. **Board de reservas** com **7 colunas** (situações): `Pré-reserva/Diálogo` → `Proposta em análise` → `Proposta aceita/Formalização` → `Documentação & Sinal` → `Contrato (assinaturas)` → `Vendida` → `Cancelada`.
14. **Movimentação por drag-and-drop com validação** de invariantes (bloqueia movimentos inválidos).
15. Clicar no card abre o **dialog central grande** com toda a linha/andamento da reserva (substitui o _sheet_ à direita).
16. **Escopo de visão**: gestor vê o board de **todas** as reservas do tenant; corretor vê **apenas as suas** (ownership).

### Notificações (avisos)
17. Nesta entrega, os avisos (testemunha, gestor, corretor) são **in-app**: indicador de "ação pendente" **no card da reserva e no menu** (ambos) + registro no **activity log** existente. (E-mail fica para depois.)

## Requisitos não funcionais

- Isolamento por `tenant_id` em todos os recursos novos.
- LGPD: propostas/contratos contêm PII; downloads autenticados, sem URL pública.
- Auditoria: toda transição grava evento append-only em `reservation_timeline_events`.
- Reaproveitar padrão de upload/PDF já existente (DomPDF; attachments autenticados).

## Regras de negócio

- **Liberdade guiada**: etapas iniciais opcionais/fora de ordem; contrato sequencial.
- Unidade **nunca sai do controle de disponibilidade**; só o gestor marca `sold`, com contrato completo anexado.
- Sinal e proposta assinada são **opcionais**; não bloqueiam o avanço (salvo a invariante de venda).
- Janela de 48h na fase inicial com **override manual** do gestor.
- Templates de proposta pertencem ao `tenant_id` (como os de contrato).

## Fluxos principais

**Ciclo de vida da pré-reserva:** corretor cria pré-reserva sem sinal (unit → `pre_reserved`, janela 48h) → **caminho A**: corretor lança sinal em 48h → **Reservado** (unit → `reserved`); **caminho B**: corretor avança (proposta/contrato) → reserva segura; **caminho C**: gestor estende/renova o prazo (ou força a queda); **sem nenhum dos anteriores em 48h** → sistema derruba automaticamente (unit → `available`).

**Proposta/Formalização:** envio (corretor) → decisão (gestor) → no aceite, upload do PDF assinado pela construtora → corretor coleta assinatura do comprador → devolução única (PDF assinado por ambos + sinal quando houver).

**Contrato:** comprador assina → corretor insere → construtora assina → testemunha 1 → testemunha 2 → aviso ao gestor → gestor confere e marca vendida → aviso ao corretor.

## Integrações externas

- Nenhuma nova nesta entrega (sem gov.br, sem e-mail). Geração de PDF de proposta reusa o pipeline de contratos (Markdown → HTML sanitizado → DomPDF).

## Restrições e premissas

- **CONFIRMADO:** a janela de 48h da pré-reserva substitui a antiga janela do sinal; sinal lançado promove a Reservado; sem sinal/avanço/extensão em 48h → queda automática. Gestor controla o prazo (estende/força queda). Sinal segue **opcional** para a venda.
- **PREMISSA (a confirmar):** o TTL de 10 min do `pre_hold` inicial permanece até virar pré-reserva "com cliente"; a validação do comprovante de sinal pelo gestor (fluxo `deposit-proof/approve` atual) permanece ou o lançamento do sinal já promove direto — a detalhar na arquitetura.
- **PREMISSA:** drag-and-drop no Kanban valida invariantes no backend (a mudança de coluna dispara a ação/transição correspondente, não um simples update de campo).
- **PREMISSA:** templates de proposta reutilizam o catálogo fechado de variáveis dos contratos + variáveis custom.
- **CONFIRMADO:** venda direta pela construtora (vendedor próprio) fica para a **Fase 2**, fora desta entrega.

## Riscos identificados

- **Consistência de estado** com liberdade de ordem: mitigar com invariantes explícitas e transições validadas no service (não confiar só no front).
- **Migração** das reservas linear→flexível: mapear `stage` atual para a nova situação/coluna preservando eventos e anexos.
- **Kanban drag-and-drop** pode sugerir transições inválidas: bloquear no backend com 422 e feedback claro.
- **Testemunhas como usuários builder**: garantir que a assinatura de testemunha não exija permissões amplas (escopo mínimo por reserva).
- **Ausência de infra de notificação**: avisos in-app podem passar despercebidos; badge de pendência precisa ser visível.
- Escopo grande: risco de _big bang_; mitigado pelo faseamento abaixo.

## Faseamento acordado

1. **Fundação** do modelo flexível no backend (situações, invariantes, transições validadas, migração de dados).
2. **Templates + formalização de proposta** (`proposals.manage`, geração de PDF, upload assinado, devolução única com sinal).
3. **Contrato + testemunhas** (assinaturas sequenciais, seleção de testemunhas, avisos in-app, invariante de venda).
4. **Kanban + dialog central** (board 7 colunas, drag-and-drop validado, dialog de detalhe substituindo o sheet).

## Lacunas / decisões pendentes

- Conjunto exato de variáveis do template de proposta (Entrega 2).
- **CONFIRMADO:** badge de ação pendente no **card e no menu**.
- **CONFIRMADO:** `pre_hold` 10 min sem cliente; 48h após vincular cliente. Lançar sinal promove direto a `reserved`; gestor ainda aprova o comprovante depois.

---
**Confirmado em 2026-09-17. Implementação na branch `feature/reservation-progress-flex`.**
