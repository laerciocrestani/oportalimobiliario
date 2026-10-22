# Resumo do Entendimento — Navegação de empreendimento e unidades

## Problema e objetivo

A construtora cadastra e edita empreendimento e unidades num wizard de três etapas (Identidade, Estrutura, Mídia). Depois de publicado, a edição vai para outra ficha, e a estrutura do rascunho não reabre.

O objetivo é unificar **novo** e **editar** no fluxo desenhado no Figma, com os componentes que o projeto já tem (formulários, editor de estrutura, galeria, comodidades, ViaCEP e descritivo por IA). A lista de empreendimentos e a ficha de detalhe ficam como estão.

Arquivo de referência: [Figma — cadastro do empreendimento](https://www.figma.com/design/NxoNQTUpf0WzWi0LzfsPyh/Untitled?node-id=0-1).

## Sistema existente

- Portal da construtora em `construtora.localhost`, API `/api/builder/*`.
- Rotas atuais: `/buildings/new`, `/buildings/:id/wizard`, `/buildings/:id/edit`, `/buildings/:id`.
- Wizard atual em `BuildingWizardPage` + `building-wizard-context.ts`, com persistência por etapa e `wizard_step`.
- Preço atual do produto é sempre INCC-M. Unidade `sold` congela o valor na emissão do contrato.
- Pavimento hoje é `residential`, `commercial` ou `garage`. Térreo é o nível 0. Subsolo é negativo.
- Status da unidade: `available`, `pre_reserved`, `reserved`, `sold`, `unavailable`.
- Id do empreendimento é numérico. Esta leva troca esse identificador para UUID.
- O que permanece: tenancy por `tenant_id`, Sanctum, componentes atuais, catálogo de comodidades, índices INCC, ViaCEP e geração de descritivo.

## Restrições organizacionais

- Sem prazo nem orçamento novo informados.
- Execução no monorepo atual, com os componentes já existentes.
- Várias torres, mídia por unidade e a esteira de venda ficam para outra leva.

## Atores

- Construtora: cria o rascunho, monta pavimentos e unidades, revisa a estrutura, publica e atualiza o empreendimento.
- Corretor: só inicia reserva de unidade que tenha preço. Unidade sem preço permanece fora da reserva.
- Admin: segue dono do catálogo de comodidades e dos índices INCC. Esta leva não muda essas telas.

## Requisitos funcionais

1. Novo e editar usam as mesmas quatro etapas: **Dados básicos**, **Estrutura**, **Revisão estrutural**, **Fotos, características e descritivo**.
2. A etapa 1 grava o rascunho no banco e o empreendimento nasce com **UUID** gerado no servidor.
3. Nas quatro etapas dá para ir e voltar. Salvar rascunho continua disponível.
4. No editar, a ação de salvar chama **Atualizar empreendimento**.
5. Publicar é ação separada de salvar. Pode publicar sem foto, sem descritivo e sem preço.
6. Empreendimento publicado perde o badge **Rascunho**.
7. A etapa 1 pergunta, por empreendimento, se o preço das unidades segue **INCC** ou **valor fixo em reais**. A máscara da unidade acompanha essa escolha.
8. A etapa de estrutura segue as telas do Figma: lista de pavimentos, pavimento-modelo, editar pavimento, clonar para cima ou para baixo, e revisão da numeração.
9. Cada pavimento tem um tipo só: residencial, comercial, hall ou garagem.
10. A linha da unidade, no editor do pavimento, reúne a ficha inteira e o preço: número, tipo, área, dormitórios, banheiros, suítes, lavabo, sacadas, posição solar, período de sol, posição do imóvel, forro, aberturas, piso e valor.
11. A etapa final trata fotos do empreendimento, comodidades do catálogo já existente e descritivo por IA.
12. Lista (`/buildings`) e ficha de detalhe (`/buildings/:id`) não mudam de navegação nesta leva.

## Requisitos não funcionais

- O isolamento por tenant e o login atual permanecem.
- UUID no lugar do id numérico do empreendimento, da torre, do pavimento e da unidade. As chaves estrangeiras que apontam para esses registros acompanham.
- Testes, seeds e fixtures passam a usar UUID. Referências ao id numérico saem, para a suíte não quebrar.
- Unidade sem preço não entra no fluxo de reserva do corretor, inclusive pela API.
- Sem SLA, volume ou prazo novos.

## Regras de negócio

- A escolha INCC ou valor fixo vale para o empreendimento inteiro.
- Essa escolha trava depois que a primeira unidade recebe preço.
- Antes de existir preço, trocar a opção na etapa 1 muda a máscara das unidades.
- Empreendimento que já existe permanece em INCC.
- No modo INCC, a unidade guarda valor-base e competência. O valor atual continua calculado na leitura pelo índice. No modo fixo, a unidade guarda um valor em reais e não acompanha o INCC.
- Vagas de garagem usam a mesma regra de preço do empreendimento.
- Clonar pavimento não sobrescreve destino ocupado. Térreo, hall e garagem já existentes permanecem protegidos.
- Hall pode ter zero unidades. Residencial e comercial têm ao menos uma unidade. Garagem tem ao menos uma vaga. Não mistura hall e salas no mesmo pavimento.
- Térreo é o nível 0 e pode ser hall, comercial ou garagem. Comercial aceita várias salas, inclusive um hall comercial com cinco unidades. Subsolo continua negativo.
- Numeração residencial segue andar + sequência, como no Figma (101, 102, 201, 202).
- Unidade com reserva não cancelada, da pré-reserva até o contrato, ou já vendida, fica bloqueada para edição, exclusão e troca de status neste fluxo.
- Unidade livre pode ser incluída, editada e removida.
- A construtora não marca unidade como vendida. A venda só acontece no fluxo que começa no corretor: reserva, proposta, sinal, contrato e testemunhas.
- Publicar sem preço é permitido. O corretor não reserva unidade sem preço.
- Foto e descritivo não são obrigatórios para publicar.
- Uma torre só nesta leva.

## Fluxos principais

1. **Novo empreendimento.** A etapa 1 grava nome, tipo, endereço e a opção de preço, e devolve o UUID. As etapas seguintes atualizam esse rascunho. A estrutura nasce pelo pavimento-modelo, edição e clonagem. A revisão estrutural confirma totais e origem (modelo, clonado, preservado). A última etapa grava fotos, comodidades e descritivo. Publicar pode ocorrer sem esses itens e sem preço.
2. **Editar empreendimento publicado.** Abre as mesmas quatro etapas, sem badge de rascunho, com **Atualizar empreendimento**. As etapas ficam livres. Unidade com processo de venda em andamento, ou já vendida, permanece bloqueada.
3. **Retomada.** Sair no meio e voltar reabre o rascunho pelo UUID, na etapa em que parou.
4. **Reserva.** O corretor só segue com unidade que tenha preço. Unidade sem preço recusa a reserva.

## Integrações externas

- ViaCEP: consulta de endereço na etapa 1, como hoje.
- Índices INCC: cálculo na leitura quando o empreendimento está em modo INCC.
- Geração de descritivo por IA: na última etapa, como hoje.
- Nenhuma integração nova.

## Restrições e premissas

- UUID é gerado no servidor ao criar o rascunho na etapa 1.
- Torre, pavimento e unidade também passam a UUID nesta leva, junto com o empreendimento.
- Dados locais já gravados com id inteiro deixam de ser válidos. A recriação do banco local só ocorre com pedido explícito.
- Salvar rascunho permanece no empreendimento ainda não publicado. No publicado, a ação visível é **Atualizar empreendimento**.
- Quem já pode criar e editar empreendimento no portal da construtora continua podendo usar este fluxo.
- Vaga de garagem segue a máscara de preço escolhida para o empreendimento.
- Residencial e comercial exigem ao menos uma unidade. Hall pode ter zero.

## Riscos identificados

- UUID atravessa reserva, contrato, portal público e corretor. A mitigação combinada é reescrever chaves, seeds e testes, sem conviver com id numérico.
- A linha da unidade com a ficha inteira fica larga. A implementação precisa caber no editor de pavimento sem abrir outro fluxo.
- Publicar sem preço só é seguro se a API de reserva do corretor recusar unidade sem valor.
- A trava atual que impede alterar estrutura de empreendimento publicado sai para unidade livre. Unidade em venda ou vendida continua bloqueada.
- Não haverá esteira de venda da construtora. A unidade só vira `sold` pelo fluxo do corretor.

## Lacunas / decisões pendentes

- Nenhuma decisão crítica em aberto. O ponto de correção, se houver, é a premissa de que torre, pavimento e unidade também viram UUID junto com o empreendimento.

---
**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
