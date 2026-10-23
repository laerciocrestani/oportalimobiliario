# Resumo do Entendimento — Várias torres

## Problema e objetivo

O wizard de empreendimento cadastra e edita uma torre só. A construtora precisa incluir outras torres no mesmo empreendimento, no fluxo de novo e no de edição, com as mesmas ações.

## Sistema existente

- Novo e editar já usam o mesmo wizard de quatro etapas.
- A etapa 1 tem um campo somente leitura "Torre única".
- A estrutura guarda pavimento-modelo, andares, clonagem e exceções por torre.
- A ficha de detalhe ainda abre um atalho "Nova torre" que grava só nome e ordem, sem pavimentos.
- Unidade vendida ou com reserva não cancelada não pode ser removida nem sumir numa remontagem da estrutura.
- Preço (INCC ou valor fixo) e categoria valem para o empreendimento inteiro.
- O que não muda: as quatro etapas, o layout já espelhado, a publicação sem preço e a trava de unidade em venda.

## Restrições organizacionais

- Mesmo monorepo, componentes e tenancy atuais.
- Sem prazo nem limite de volume novos.

## Atores

- Construtora: cria o empreendimento, monta a primeira torre e acrescenta as seguintes no fim do cadastro. Edita o mesmo conjunto depois.
- Corretor: continua reservando unidade com preço. Não cadastra torre.
- Admin: sem tela nova nesta leva.

## Requisitos funcionais

1. Novo e editar oferecem as mesmas ações de torre.
2. A primeira torre continua nascendo na etapa de estrutura, como hoje.
3. Outras torres entram no fim do cadastro da estrutura, por cópia da torre anterior.
4. O campo "Torre única" sai da etapa 1. Uma ou várias torres não é uma escolha inicial.
5. Cada torre nova recebe nome automático Torre A, Torre B, Torre C, e o nome permanece editável.
6. Não há teto de torres.
7. Depois da cópia, cada torre segue independente: pavimento-modelo, andares, clonagem e exceções próprios.
8. A ficha de detalhe não cria torre vazia por um atalho diferente do wizard.

## Requisitos não funcionais

- Isolamento por tenant e login atuais permanecem.
- Identificadores de torre, pavimento e unidade continuam UUID.
- Sem SLA novo.

## Regras de negócio

- A segunda torre copia a estrutura da primeira. A terceira copia a segunda, e assim por diante: a nova copia a última já cadastrada.
- A cópia leva pavimentos, tipos, unidades e características. Em seguida a torre nova pode ser alterada sem mudar a de origem.
- Nome inicial: Torre A para a primeira, Torre B para a seguinte, na ordem em que nascem. O texto do nome pode ser trocado.
- Não dá para remover uma unidade que tenha qualquer referência: vendida ou em qualquer etapa de reserva, inclusive cancelada.
- Não dá para remover uma torre que contenha unidade nessa situação.
- Unidade livre, sem referência, continua podendo ser incluída, editada e removida. Torre só com unidades livres pode ser removida.
- Preço e categoria continuam do empreendimento, não da torre.

## Fluxos principais

1. **Novo empreendimento.** A etapa 1 grava os dados, sem perguntar quantas torres. A estrutura monta a primeira torre. No fim dessa etapa, a construtora pode adicionar outra torre, que nasce como cópia da anterior, com o próximo nome (Torre B, Torre C). A revisão lista todas. Publicar segue as regras já vigentes.
2. **Editar.** O mesmo wizard reabre todas as torres. Dá para acrescentar outra cópia, renomear e alterar a estrutura de cada uma, respeitando a trava de unidade referenciada.
3. **Remoção.** Unidade ou torre com venda ou reserva em qualquer etapa permanece. O sistema recusa a exclusão.

## Integrações externas

- Nenhuma nova. ViaCEP, INCC, proposta e reserva permanecem como estão.

## Restrições e premissas

- PREMISSA: "copia a estrutura da segunda" significa que a torre nova copia a última torre já existente. Com uma torre só, a próxima copia essa primeira.
- PREMISSA: "no final do processo de inserção" é o fim da etapa de estrutura, antes da revisão, também disponível na edição.
- PREMISSA: "qualquer etapa" inclui reserva cancelada. Uma unidade que já passou por reserva não volta a ser apagável, e a torre dela também não.
- PREMISSA: o atalho "Nova torre" da ficha deixa de criar torre sem pavimentos. Incluir torre passa pelo wizard.

## Riscos identificados

- Reserva cancelada bloquear a exclusão para sempre impede corrigir um cadastro depois de um interesse desfeito. A mitigação é a premissa acima; se a trava for só para etapa ativa ou vendida, o resumo muda.
- Muitas torres copiadas aumentam o payload da estrutura. Sem teto, a tela precisa continuar usável com a lista de torres, sem paginação nova nesta leva.
- Copiar unidade vendida ou em reserva para a torre nova criaria outra unidade livre com os mesmos dados, sem herdar a reserva. A reserva continua só na torre de origem.

## Lacunas / decisões pendentes

- Nenhuma decisão crítica além das premissas acima. A confirmação deste resumo as aceita.

---
**Confirmado em 22/10/2026.** Arquitetura em seguida. Implementação só depois do plano aceito.
