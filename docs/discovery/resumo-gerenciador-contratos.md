# Resumo do Entendimento — Gerenciador de contratos

## Problema e objetivo

A etapa **Emitir contrato** existe na timeline, mas o botão não faz nada: não há API, dialog nem geração de PDF. A construtora precisa cadastrar modelos de contrato com variáveis e, na reserva, escolher um modelo para gerar o PDF vinculado. O corretor não edita o contrato; só a construtora altera o conteúdo até a assinatura.

## Sistema existente

- Timeline já expõe `issue_contract` só para o builder; o clique não tem handler.
- `POST /api/builder/reservations/{id}/contract/issue` está no OpenAPI como Planned (upload manual — substituído por modelos + geração).
- Dados do cliente/cônjuge já entram em `POST .../contract-data` (`reservation_proposals`).
- Decisão antiga D-03 (upload manual de PDF na v1) fica substituída por modelos + geração.
- REQ-RTL-018 dizia que o corretor **não vê** o contrato completo; o PDF emitido é somente leitura (override confirmado).
- Stack: Laravel API + React SPA + shadcn. Sem editor rico no frontend hoje.
- Wizard de empreendimentos prevê `units.frozen_price_brl` preenchido na emissão (coluna nasce nesta feature se ainda não existir).

## Restrições organizacionais

- Entrega incremental no monorepo atual; sem pedido de prazo/orçamento.
- Sem integração gov.br nesta fatia (assinatura continua etapa posterior).

## Atores

- **Gestor da construtora:** cria/edita/lista/inativa modelos (`contracts.manage`); emite o contrato na reserva (`reservations.cancel`); pode reemitir antes da assinatura.
- **Corretor:** não cria nem edita modelos nem o contrato; vê e baixa o PDF gerado (somente leitura) para levar à assinatura.
- **Cliente:** não usa o sistema nesta fatia.

## Requisitos funcionais

1. CRUD de modelos de contrato no portal da construtora (tenant inteiro, não por empreendimento).
2. Editor rico (negrito, listas, títulos) com armazenamento em Markdown e inserção de variáveis `{{chave}}` a partir de uma legenda.
3. Lista fechada de variáveis do sistema (preenchidas automaticamente na emissão; editáveis no dialog).
4. Construtora pode criar variáveis custom no modelo; na emissão esses campos aparecem vazios para preenchimento manual.
5. Botão **Emitir contrato** abre dialog: escolher modelo → revisar valores (sistema + custom) + R$ final → gerar PDF e vincular à reserva.
6. PDF gerado pelo sistema; corretor não altera.
7. Construtora pode reemitir (mesmos campos) **antes da assinatura**; substitui o PDF anterior.
8. Na emissão, gestor confirma ou altera o valor final em R$; esse valor congela em `units.frozen_price_brl` e entra no contrato (`{{preco_final}}`).

## Requisitos não funcionais

- Isolamento por `tenant_id`.
- PDF persistido como attachment `contract_pdf` da reserva (download autenticado, sem URL pública).
- Auditoria: evento `contract_issued` a cada emissão/reemissão.
- Conteúdo do modelo e do contrato emitido contém PII (LGPD): acesso só do tenant e do corretor dono da reserva.

## Regras de negócio

- Modelos pertencem à construtora (`tenant_id`), não à unidade/empreendimento.
- Um contrato emitido por reserva neste MVP (escolher um modelo por emissão).
- Variáveis do sistema vêm dos dados já cadastrados (proposta, cliente, unidade, empreendimento, corretor).
- Variável custom (ou placeholder desconhecido) **obrigatória** na emissão se aparece no texto — bloquear com 422 se vazia.
- Modelo inativo some da lista do dialog de emitir; permanece no CRUD para reativar.
- Depois de iniciado o fluxo de assinatura (upload do assinado / evento GOV), a construtora não reemite mais nesta fatia.
- Dialog de emitir **não** edita o texto do modelo: só valores das variáveis e o R$ final. Texto muda no catálogo **Contratos**.

## Fluxos principais

1. Construtora acessa **Contratos** → cria modelo (nome + corpo Markdown com variáveis).
2. Corretor envia dados para contrato (já existe).
3. Construtora clica **Emitir contrato** → escolhe modelo ativo → vê campos preenchidos da lista fechada (editáveis) + campos custom + R$ final → confirma.
4. Sistema substitui `{{variaveis}}`, gera PDF, grava attachment, congela preço, avança para `contract_issued`.
5. Antes da assinatura, construtora pode reabrir o dialog, ajustar valores/R$ e gerar outro PDF (substitui o anterior).
6. Corretor visualiza/baixa o PDF, sem edição.

## Integrações externas

- Nenhuma nesta fatia (sem gov.br, sem e-mail obrigatório).
- Geração de PDF no backend (Markdown → HTML sanitizado → DomPDF).

## Restrições e premissas

- **CONFIRMADO:** edição/reemissão altera o **contrato daquela reserva**, não o modelo do catálogo.
- **CONFIRMADO:** corretor **vê e baixa** o PDF, sem editar (override de REQ-RTL-018 para o PDF emitido).
- **CONFIRMADO:** reemitir **substitui** o PDF anterior até existir contrato assinado.
- **CONFIRMADO:** variável custom = slug (`{{comissao_extra}}`) + rótulo opcional; valor é texto livre no dialog de emissão.
- **CONFIRMADO:** lista fechada inicial (cliente, cônjuge, endereço, unidade, empreendimento, proposta, corretor, data de emissão, preço final).
- **CONFIRMADO:** item de menu **Contratos** no portal da construtora.
- **CONFIRMADO:** permissão nova `contracts.manage` para CRUD; emitir usa quem já acessa reservas (`reservations.cancel`).
- **CONFIRMADO:** variável usada no texto sem valor → bloquear emitir.
- **CONFIRMADO:** modelo inativo some da lista de emitir.
- **CONFIRMADO:** override de R$ na emissão entra nesta fatia.
- **CONFIRMADO:** no dialog de emitir, só variáveis + R$ final (não o texto completo).
- **Fora desta fatia:** assinatura GOV, upload do assinado, validar venda, envio por e-mail/WhatsApp.

## Riscos identificados

- Editor rico + Markdown: risco de HTML inseguro no PDF — sanitizar na geração.
- Variáveis inventadas com typo (`{{nome_clinte}}`) viram campo custom obrigatório na emissão — mostrar aviso.
- PDF com dados pessoais: não expor URL pública sem auth.
- `frozen_price_brl` também está no wizard T-05 (ainda não migrado): esta feature cria a coluna; o wizard não deve duplicá-la.

## Lacunas / decisões pendentes

Nenhuma — fechadas em 2026-08-19.

---
**Confirmado em 2026-08-19. Spec em `.specs/features/builder-contracts/`.**
