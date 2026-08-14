# Resumo do Entendimento — Gerenciador de contratos

## Problema e objetivo

A etapa **Emitir contrato** existe na timeline, mas o botão não faz nada: não há API, dialog nem geração de PDF. A construtora precisa cadastrar modelos de contrato com variáveis e, na reserva, escolher um modelo para gerar o PDF vinculado. O corretor não edita o contrato; só a construtora altera o conteúdo até a assinatura.

## Sistema existente

- Timeline já expõe `issue_contract` só para o builder; o clique não tem handler.
- `POST /api/builder/reservations/{id}/contract/issue` está no OpenAPI como Planned.
- Dados do cliente/cônjuge já entram em `POST .../contract-data` (`reservation_proposals`).
- Decisão antiga D-03 (upload manual de PDF na v1) fica substituída por modelos + geração.
- REQ-RTL-018 dizia que o corretor **não vê** o contrato completo; o pedido atual implica visualização somente leitura. Ver premissa abaixo.
- Stack: Laravel API + React SPA + shadcn. Sem editor rico no frontend hoje.

## Restrições organizacionais

- Entrega incremental no monorepo atual; sem pedido de prazo/orçamento.
- Sem integração gov.br nesta fatia (assinatura continua etapa posterior).

## Atores

- **Gestor da construtora:** cria/edita/lista modelos; emite o contrato na reserva; pode editar o contrato emitido antes da assinatura.
- **Corretor:** não cria nem edita modelos nem o contrato; recebe o PDF gerado (somente leitura) para levar à assinatura.
- **Cliente:** não usa o sistema nesta fatia.

## Requisitos funcionais

1. CRUD de modelos de contrato no portal da construtora (tenant inteiro, não por empreendimento).
2. Editor rico (negrito, listas, títulos) com armazenamento em Markdown e inserção de variáveis `{{chave}}` a partir de uma legenda.
3. Lista fechada de variáveis do sistema (preenchidas automaticamente na emissão).
4. Construtora pode criar variáveis custom no modelo; na emissão esses campos aparecem vazios para preenchimento/edição manual.
5. Botão **Emitir contrato** abre dialog: escolher modelo → revisar valores (sistema + custom) → gerar PDF e vincular à reserva.
6. PDF gerado pelo sistema; corretor não altera.
7. Construtora pode editar o contrato da reserva e gerar de novo **antes da assinatura**.

## Requisitos não funcionais

- Isolamento por `tenant_id`.
- PDF persistido como attachment `contract_pdf` da reserva.
- Auditoria: evento `contract_issued` na timeline (reemissão gera novo evento ou atualiza o attachment — premissa).
- Conteúdo do modelo e do contrato emitido contém PII (LGPD): acesso só do tenant e do corretor dono da reserva, no que for permitido.

## Regras de negócio

- Modelos pertencem à construtora (`tenant_id`), não à unidade/empreendimento.
- Um contrato emitido por reserva neste MVP (escolher um modelo por emissão).
- Variáveis do sistema vêm dos dados já cadastrados (proposta, cliente, unidade, empreendimento).
- Variáveis custom exigem valor na emissão (ou ficam em branco se a construtora deixar vazio — premissa: obrigatório se usadas no modelo).
- Depois de iniciado o fluxo de assinatura (upload do assinado / GOV), a construtora não edita mais o PDF emitido nesta fatia.

## Fluxos principais

1. Construtora acessa **Contratos** → cria modelo (nome + corpo Markdown com variáveis).
2. Corretor envia dados para contrato (já existe).
3. Construtora clica **Emitir contrato** → escolhe modelo → vê campos preenchidos da lista fechada (editáveis) + campos custom → confirma.
4. Sistema substitui `{{variaveis}}`, gera PDF, grava attachment, avança para `contract_issued`.
5. Antes da assinatura, construtora pode reabrir, ajustar valores/texto e gerar outro PDF.
6. Corretor visualiza/baixa o PDF, sem edição.

## Integrações externas

- Nenhuma nesta fatia (sem gov.br, sem e-mail obrigatório).
- Geração de PDF no backend (HTML/Markdown → PDF).

## Restrições e premissas

- **PREMISSA:** edição após emitir altera o **contrato daquela reserva**, não o modelo do catálogo.
- **PREMISSA:** corretor **vê e baixa** o PDF, sem editar (override de REQ-RTL-018 para o PDF emitido).
- **PREMISSA:** reemitir/editar **substitui** o PDF anterior até existir contrato assinado.
- **PREMISSA:** variável custom = slug (`{{comissao_extra}}`) + rótulo opcional; valor é texto livre no dialog de emissão.
- **PREMISSA:** lista fechada inicial (cliente, cônjuge, endereço, unidade, empreendimento, proposta, corretor, data de emissão).
- **PREMISSA:** item de menu **Contratos** no portal da construtora.
- **PREMISSA:** permissão nova `contracts.manage` para CRUD; emitir usa quem já acessa reservas da construtora.
- **Fora desta fatia:** assinatura GOV, upload do assinado, validar venda, envio por e-mail/WhatsApp.

## Riscos identificados

- Editor rico + Markdown: risco de HTML inseguro no PDF — sanitizar na geração.
- Variáveis inventadas com typo (`{{nome_clinte}}`) viram campo custom vazio na emissão — mostrar aviso.
- PDF com dados pessoais: não expor URL pública sem auth.
- Dependência de lib de PDF no Laravel — escolher na fase de design.

## Lacunas / decisões pendentes

1. Confirmar as premissas acima, sobretudo **corretor vê o PDF** e **edição = instância da reserva**.
2. Variável custom sem valor na emissão: bloquear ou permitir vazio?
3. Modelo inativo/arquivado: some da lista do dialog de emitir?

---
**Aguardando confirmação antes de spec, arquitetura ou implementação.**
