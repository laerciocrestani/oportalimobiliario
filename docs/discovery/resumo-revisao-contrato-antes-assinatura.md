# Resumo do Entendimento — Revisão do contrato antes da assinatura

## Problema e objetivo

Ao aprovar o sinal, a reserva entra na coluna **Contrato (assinaturas)**. Hoje a emissão do PDF e o envio ao ZapSign acontecem cedo demais: as quatro pessoas podem ser notificadas antes de o gestor ler o texto.

O gestor da construtora precisa ver o contrato já preenchido, trocar o modelo se houver mais de um, editar o texto desta reserva se quiser, e só então aceitar. O PDF e o disparo para assinatura nascem nesse aceite. A timeline de aguardando assinatura aparece depois do envio.

## Sistema existente

- Laravel API + React. Coluna **Contrato (assinaturas)** já recebe a reserva quando o sinal é aprovado.
- Modelos de contrato em Markdown, por construtora. O exemplo padrão é a promessa de compra e venda, preenchida com os dados da reserva.
- ZapSign já envia comprador, gestor e duas testemunhas. A timeline de aguardando assinatura e o rodapé `Assinaturas: n/4` já existem.
- O que não muda nesta fatia: modelo padrão da construtora, papel do corretor, rich text, WhatsApp.

## Restrições organizacionais

- Mesmo produto e mesmo time. Sem prazo nem orçamento novos informados.
- Rich text fica para depois. Nesta fatia a edição é textarea.
- WhatsApp fica para depois. Nesta fatia o canal ativo é o e-mail.

## Atores

- **Gestor da construtora com permissão de contratos:** lê, troca o modelo, edita o texto desta reserva e aceita. Só o aceite gera o PDF e dispara a assinatura.
- **Corretor:** não gera, não edita, não aceita e não dispara. Nesta etapa não age.
- **Comprador, gestor signatário e duas testemunhas:** recebem o pedido de assinatura somente depois do aceite.

## Requisitos funcionais

1. Com um único modelo, o andamento já mostra o contrato preenchido. Não há botão **Gerar contrato**. O gestor ainda precisa ler e aceitar, ou editar e aceitar.
2. Com mais de um modelo, o preview tem um select. Ao trocar, o conteúdo passa a ser o modelo escolhido, já preenchido, com **Aceitar** e **Editar**.
3. O preview abre em modal. O rodapé oferece editar ou aceitar.
4. **Editar** abre um dialog com o texto desta reserva em textarea. O gestor pode alterar tudo. Salvar só atualiza o preview. Não gera PDF e não envia.
5. A edição vale somente para esta reserva. O modelo da construtora permanece como está.
6. **Aceitar** gera o PDF e envia o pedido de assinatura pelo ZapSign. A timeline de aguardando assinatura passa a aparecer.
7. Depois do aceite não há nova edição nem novo envio a partir desse fluxo.
8. Quem não tem a permissão de contratos na construtora não vê aceitar nem editar.

## Requisitos não funcionais

- O PDF não é persistido antes do aceite.
- Envio atual só por e-mail, para quem tiver e-mail no cadastro.
- WhatsApp será um canal adicional depois, também só quando houver telefone no cadastro. Não entra nesta fatia.
- Sem SLA novo. O envio reutiliza o ZapSign e o e-mail já existentes.

## Regras de negócio

- Aprovar o sinal coloca o card em **Contrato (assinaturas)**. Isso não dispara assinatura.
- O texto inicial é o modelo preenchido com os dados da reserva. Serve para o gestor não começar do zero.
- Trocar o modelo, antes do aceite, substitui o texto da reserva pelo novo modelo preenchido.
- Edição manual não altera o catálogo de modelos.
- Aceite é irreversível neste fluxo: despacha comprador, gestor e as duas testemunhas.
- Corretor não participa desta decisão.

## Fluxos principais

1. Sinal aprovado → card em **Contrato (assinaturas)** → preview preenchido, sem PDF e sem timeline de assinatura.
2. Um modelo → preview direto. Vários modelos → select no preview; a troca atualiza o texto na hora.
3. **Editar** → textarea → salvar → preview atualizado. O gestor ainda precisa aceitar.
4. **Aceitar** → gera o PDF → ZapSign → e-mail de quem tiver e-mail → timeline de aguardando assinatura (`n/4`).
5. Corretor abre o andamento e não tem ação de contrato.

## Integrações externas

- **ZapSign:** envio do PDF e coleta das quatro assinaturas. Disparo só no aceite.
- **E-mail:** canal desta fatia, quando o cadastro tiver e-mail.
- **WhatsApp:** fora desta fatia. Depois, somente se houver telefone no cadastro.

## Restrições e premissas

- A permissão usada é a permissão de contratos já existente no portal da construtora.
- O select de modelo só aparece quando há mais de um modelo ativo.
- Trocar o modelo antes do aceite descarta edição ainda não aceita e mostra o modelo novo preenchido.
- A textarea recebe o texto já preenchido desta reserva, não o modelo com variáveis soltas.
- Pessoa sem e-mail não bloqueia o aceite. O e-mail dela é omitido. WhatsApp não é chamado agora.
- O corretor vê o andamento sem botões de aceitar ou editar.

## Riscos identificados

- **Textarea no lugar de rich text:** o gestor pode desformatar cláusulas. Aceito para esta fatia; rich text fica para depois.
- **Troca de modelo depois de editar:** a edição local se perde. Premissa explícita acima.
- **Aceite irreversível:** um texto aceito com erro segue para as quatro pessoas. A mitigação é a leitura obrigatória antes do aceite.
- **E-mail ausente:** a pessoa não é notificada nesta fatia. O link continua existindo no ZapSign para um reenvio futuro.

## Lacunas / decisões pendentes

- Nenhuma decisão bloqueante. As premissas acima podem ser corrigidas na confirmação.

---
**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
