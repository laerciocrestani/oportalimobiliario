# Resumo do Entendimento — Reserva direta, proposta e ZapSign

## Problema e objetivo

A coluna Pré-reserva/Diálogo deixa de existir. O primeiro passo do corretor na unidade é **Reservar**: a unidade trava na hora e a proposta abre com os dados básicos do cliente, preenchida a partir do template comercial da construtora.

A construtora só vê o card depois do envio. A partir daí o diálogo é por mensagem, e a construtora apenas aceita ou recusa. O PDF da proposta nasce no aceite e segue para assinatura no ZapSign. O contrato, mais adiante, também assina pelo ZapSign. Quem assina pela construtora, e quem testemunha o contrato, sai de uma config geral da construtora, válida para todos os contratos.

Objetivo: a construtora recebe uma proposta concreta de imediato, negocia em cima dela e a unidade só segue no funil depois da decisão e das assinaturas.

## Sistema existente

- Stack: Laravel API + React SPA (portais corretor e construtora). Kanban com 7 colunas; a primeira é `pre_reservation` (Pré-reserva/Diálogo).
- Hoje o corretor inicia por pré-reserva (10 min sem cliente, 48 h com cliente). A unidade fica `pre_reserved` até o aceite. O diálogo vive nessa coluna. A construtora pode aceitar, devolver ou recusar a proposta. O PDF de proposta é emitido pela construtora; a formalização pede devolução do PDF assinado. Testemunhas do contrato assinam in-app, em 2 vagas fixas.
- ZapSign não existe no repositório. WhatsApp já existe para convites.
- Permanece neste recorte: portais, tenancy, colunas de documentação, contrato e venda, e a regra de que só a construtora marca `sold`.
- Muda: início do fluxo, coluna Pré-reserva, devolução de proposta, upload manual de PDF assinado, assinatura in-app, testemunhas fixas e o momento do sinal em dinheiro.
- Cards que já estão em Pré-reserva são cancelados na entrada desta regra.

## Restrições organizacionais

- Mesma equipe do produto. Prazo de entrega não foi definido.
- A conta ZapSign é da plataforma, não de cada construtora.
- Premissa: nada é implementado antes da confirmação explícita deste resumo.

## Atores

- **Corretor:** reserva a unidade, preenche a proposta com dados básicos do cliente, altera a proposta enquanto ela está em análise, dialoga por mensagem, completa os dados do cliente antes do contrato, assina a proposta e pode disparar o lembrete de assinatura. No contrato, assina só quando a config geral reserva uma vaga de testemunha para o corretor da venda.
- **Construtora (gestor):** vê a proposta só após o envio, dialoga, prorroga o prazo, aceita ou recusa, mantém a config geral de signatários e testemunhas e pode disparar o lembrete de assinatura.
- **Comprador:** assina proposta e contrato pelo link (e-mail e/ou WhatsApp). Paga o sinal em PIX, quando o sinal é em dinheiro, só depois que todos assinaram a proposta. Não usa o portal.
- **Pessoas do time da construtora:** escolhidas na config geral para assinar pela construtora e para testemunhar o contrato.
- **ZapSign (conta da plataforma):** coleta as assinaturas da proposta e do contrato.

## Requisitos funcionais

1. O botão da unidade passa de Pré-reservar para **Reservar**. O clique trava a unidade e abre a proposta.
2. O corretor tem **20 minutos corridos** para preencher e enviar. O prazo vale em qualquer dia, inclusive sábado, domingo e feriado.
3. A proposta usa o template comercial da construtora e já sai com os dados básicos do cliente: nome, telefone e e-mail.
4. Se os 20 minutos acabam sem envio, a reserva é descartada e a unidade volta a ficar disponível. A construtora não vê esse card.
5. Depois do envio, o card entra em **Proposta em análise**, visível para a construtora.
6. A construtora tem **48 horas** para dialogar, aceitar ou recusar. O diálogo é só o campo de mensagem. Não há mais devolução da proposta.
7. O relógio das 48 horas pausa em sábado, domingo e feriado nacional brasileiro: nesses dias a contagem não desce. Em dia útil corre o dia inteiro. A construtora prorroga com **+ X horas**, sempre somadas ao contador, mesmo durante a pausa.
8. Cada alteração da proposta pelo corretor, ainda em análise, substitui a versão no mesmo card e **reinicia as 48 horas**. Não há limite de alterações. Depois do aceite ou da recusa, o corretor não altera mais.
9. Sem decisão ao fim do prazo, a proposta é recusada e a unidade volta a ficar disponível.
10. No aceite, o sistema gera o PDF da proposta e envia ao ZapSign. A coluna Formalização passa a ser espera das assinaturas. O card só segue adiante quando comprador, construtora e corretor tiverem assinado a proposta.
11. Quem assina pela construtora na proposta não é quem clicou em aceitar e não é uma escolha nesse momento. É uma pessoa do time definida na **config geral** da construtora.
12. O link de assinatura sai por **WhatsApp e e-mail ao mesmo tempo** quando há e-mail. Sem e-mail, sai só por WhatsApp.
13. Atraso de assinatura não cancela a reserva. Quem ainda não assinou recebe um aviso **todo dia às 8h** (fuso de Brasília). Corretor ou construtora também disparam esse aviso por um botão.
14. Os dados completos do cliente são preenchidos pelo corretor **antes de gerar o contrato**: nome, estado civil, profissão, CPF/CNPJ, RG, endereço, CEP e e-mail.
15. A config geral da construtora vale para **todos** os contratos. Nela ela define o número de testemunhas. Exemplo: se escolher 3, pode indicar 3 pessoas do time, ou 2 pessoas do time e o corretor responsável pela venda daquela unidade. O corretor não é um usuário fixo da config: a vaga, quando existe, é preenchida pelo corretor da reserva.
16. Comprador e construtora assinam o contrato sempre. As testemunhas entram conforme a config geral.
17. Sinal em dinheiro (valor/PIX) só é feito pelo comprador **depois** que todos assinaram a proposta. Se o sinal for um bem já descrito na proposta (terreno, moto ou outro), não há etapa de valor nem de PIX.

## Requisitos não funcionais

- Concorrência: a unidade fica indisponível para outros corretores nos 20 minutos e durante toda a análise, inclusive nas prorrogações.
- Relógio da análise: fuso de Brasília; pausa em sábado, domingo e feriado nacional; não pausa de noite em dia útil.
- Os 20 minutos são relógio corrido, sem pausa.
- Lembrete de assinatura atrasada: todo dia às 8h, fuso de Brasília, para cada signatário pendente, além do disparo manual.
- Isolamento por construtora (tenant) permanece. A credencial do ZapSign é uma só, da plataforma.
- Disponibilidade do funil de assinatura depende do ZapSign da plataforma e do canal de WhatsApp.

## Regras de negócio

- Só a construtora aceita ou recusa a proposta.
- Recusa da construtora, ou prazo de análise esgotado, encerra a reserva e libera a unidade.
- O corretor só edita a proposta na coluna Proposta em análise.
- A proposta só segue depois da assinatura de comprador, construtora e corretor.
- Proposta usa dados básicos. Contrato exige os dados completos do cliente antes da geração do PDF.
- Signatário da construtora e testemunhas do contrato vêm da config geral e se aplicam a todos os contratos gerados com essa config.
- A vaga de testemunha do corretor, quando a config a inclui, usa o corretor daquela venda.
- Atraso ou recusa de um signatário no ZapSign não libera a unidade: gera aviso e permite novo disparo do link.
- PIX de sinal não começa no aceite. Começa quando a proposta está assinada por todos. Bem dado como sinal, já escrito na proposta, dispensa PIX.
- Cards já existentes em Pré-reserva são cancelados.

## Fluxos principais

1. **Reserva e envio.** Corretor clica em Reservar → unidade trava → preenche proposta e dados básicos em até 20 minutos → envia. Sem envio, a reserva some e a unidade libera.
2. **Análise.** Construtora vê o card, troca mensagens, pode somar horas ao prazo. Corretor pode substituir a proposta, e as 48 horas recomeçam. Construtora aceita ou recusa. Sem decisão no fim do prazo, vale como recusa e a unidade libera.
3. **Assinatura da proposta.** Aceite gera o PDF e abre o ZapSign para comprador, a pessoa da construtora definida na config geral, e o corretor da venda. Links por WhatsApp e, se houver e-mail, também por e-mail. Às 8h, quem não assinou é avisado de novo.
4. **Sinal.** Com todas as assinaturas: se o sinal é dinheiro, o comprador faz o PIX nessa etapa. Se o sinal é um bem já embutido na proposta, essa etapa de valor/PIX não existe.
5. **Contrato.** Corretor completa os dados do cliente. Sistema gera o contrato. ZapSign coleta comprador, construtora e as testemunhas da config geral (time e, se configurado, o corretor da venda). A venda continua a cargo da construtora, depois das assinaturas exigidas.

## Integrações externas

- **ZapSign (conta da plataforma):** envio do PDF de proposta e do PDF de contrato; coleta de assinaturas; retorno de assinado, recusado ou expirado. Direção: plataforma → ZapSign e webhook de volta. Uma credencial serve todas as construtoras.
- **WhatsApp:** entrega do link de assinatura. Já existe canal de convite no produto; o link de assinatura é uso novo.
- **E-mail:** o mesmo link, enviado junto com o WhatsApp quando o destinatário tem e-mail.
- **Calendário de feriados nacionais brasileiros:** pausa do relógio de 48 horas. Não existe no produto hoje.

## Restrições e premissas

- As 48 horas correm 24 horas em dia útil e só pausam em sábado, domingo e feriado nacional. Não há janela comercial (9h–18h).
- Fuso do relógio e do lembrete das 8h: America/Sao_Paulo.
- E-mail faz parte dos dados básicos. Se faltar, o link de assinatura segue só por WhatsApp e o envio da proposta não fica bloqueado por isso.
- Recusa explícita de um signatário no ZapSign segue o mesmo caminho do atraso: avisa e permite reenviar o link. Não cancela a reserva.
- A config geral passa a valer para contratos gerados depois que ela é salva. Um contrato já enviado ao ZapSign mantém os signatários daquele envio.
- O representante da construtora na proposta é uma pessoa do time escolhida nessa mesma config geral, em campo próprio, separado da lista de testemunhas do contrato.
- Não foi definido um prazo novo para o comprador pagar o PIX depois das assinaturas. A etapa existe; o prazo antigo de 48 horas contado desde o aceite deixa de ser a regra de início do sinal.
- + X horas é um valor escolhido pela construtora em cada prorrogação, somado ao contador atual.
- Prazo de entrega do produto não foi definido.

## Riscos identificados

- **Unidade bloqueada sem teto:** o corretor pode alterar a proposta sem limite e cada alteração reinicia as 48 horas. A unidade só libera no aceite, na recusa ou no fim do prazo. Risco aceito.
- **Cancelamento das pré-reservas atuais:** diálogos em andamento nessa coluna se perdem na entrada da regra.
- **Conta única do ZapSign:** uma falha ou um limite dessa conta para a assinatura de todas as construtoras.
- **WhatsApp:** entrega do link não é garantida; o disparo manual existe como compensação.
- **Testemunhas variáveis:** o modelo atual tem 2 vagas fixas e assinatura in-app. A config geral muda esse contrato de dados, e a vaga do corretor só se resolve na hora da venda.
- **Feriados:** o calendário nacional precisa de uma fonte mantida, senão o relógio conta dia que deveria pausar.
- **Sinal em bem:** se a proposta não deixar explícito que o sinal é um bem, o funil pode pedir PIX indevido, ou pular PIX quando ainda há valor a receber.

## Lacunas / decisões pendentes

- Nenhuma decisão crítica em aberto. O prazo para o comprador concluir o PIX, depois das assinaturas, fica sem regra nova até uma definição posterior.

---
**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
