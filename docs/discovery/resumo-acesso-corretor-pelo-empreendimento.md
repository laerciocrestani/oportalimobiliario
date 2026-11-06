# Resumo do Entendimento — Acesso do corretor pelo empreendimento

## Problema e objetivo

No site modelo, o botão **Solicitar acesso para comercializar esse empreendimento** hoje só grava nome, telefone e e-mail opcional e avisa a construtora por e-mail. Isso não entra na fila **Solicitações pendentes** e não cria acesso no portal do corretor.

O objetivo é uma segunda entrada de corretor, no mesmo espírito do cadastro pelo link aberto, com a opção de entrar com uma conta que já existe. A construtora aprova. A aprovação vincula o corretor à construtora e libera só o empreendimento do pedido no dashboard do corretor.

## Sistema existente

- Site modelo em `www.localhost:4321`, ficha `/modelo/empreendimentos/:slug`. O botão já existe.
- Portal do corretor em `corretor.localhost:5173`. O login de hoje grava o token Sanctum em `opim_token`, no `localStorage` daquele host. Outro subdomínio não lê esse valor.
- `SANCTUM_STATEFUL_DOMAINS` já lista `www.localhost` e `corretor.localhost`. `SESSION_DOMAIN` está vazio, então o cookie de sessão não atravessa os dois.
- Cadastro pelo link aberto (`/join/:token`): nome, celular, e-mail e senha. Cria o usuário `broker`, o vínculo com a construtora ainda sem aprovação, e já entra no portal como pendente.
- A construtora aprova ou recusa em **Convites → Solicitações pendentes**. Aprovar só marca o vínculo. O empreendimento é concedido depois, em outro passo.
- O que permanece: tenancy por `tenant_id`, Sanctum, a fila de aprovação e a regra de que empreendimento sem concessão não aparece para o corretor.

## Restrições organizacionais

- Sem prazo nem orçamento novo informados.
- Execução no monorepo atual, reusando o cadastro aberto e a fila de solicitações pendentes.

## Atores

- Visitante do site modelo: pede para comercializar um empreendimento publicado. Pode já ser corretor.
- Corretor: entra com a conta existente ou cria uma. Depois da aprovação, vê só o empreendimento concedido no dashboard.
- Construtora: aprova ou recusa na fila que já usa para o link aberto. Quem aprova é quem já pode aprovar corretor pendente.

## Requisitos funcionais

1. O botão do empreendimento pede identificação na própria ficha, antes de enviar o pedido.
2. Corretor já identificado, no site modelo ou no portal, entra com essa mesma conta. O pedido usa nome, telefone e e-mail dela.
3. Sem sessão, a ficha oferece **Entrar** ou **Criar conta**. Criar conta repete o cadastro aberto: nome, celular com DDD, e-mail, senha e confirmação.
4. Entrar usa a conta de corretor já existente. Não cria outro usuário.
5. Criar conta cria o corretor, o vínculo pendente com a construtora daquele empreendimento e a sessão compartilhada. O dashboard do corretor abre com essa mesma sessão, ainda pendente de aprovação.
6. A construtora vê o pedido em **Solicitações pendentes**, com o empreendimento pedido.
7. Aprovar vincula o corretor à construtora, se o vínculo ainda estiver pendente, e libera só aquele empreendimento no dashboard do corretor.
8. Os outros empreendimentos da construtora continuam fechados até ela conceder.
9. Recusar um cadastro novo desfaz o vínculo pendente e não libera o empreendimento.
10. Recusar um corretor que já estava vinculado só nega aquele empreendimento. O vínculo com a construtora permanece.

## Requisitos não funcionais

- Uma conta de corretor, uma sessão. Login no site modelo ou no portal vale nos dois. Logout num lado encerra nos dois.
- O identificador é o token Sanctum que o login já emite. Ele passa a ser guardado num cookie do domínio pai (`.localhost` em dev), lido pelo site modelo e pelo portal. Um segundo formato de token não entra.
- O pedido continua sem lead anônimo. Quem pede é uma conta de corretor.
- Isolamento por construtora: o pedido e a liberação valem só para o tenant do empreendimento.
- O limite de tentativas do endpoint público atual não se aplica a esta entrada autenticada. Login e cadastro seguem as regras já usadas no portal do corretor.
- Nenhum dado de outro corretor ou de outra construtora aparece na tela.

## Regras de negócio

- Empreendimento não publicado não aceita pedido.
- Conta que não é corretor não pede acesso por este botão.
- Telefone ou e-mail já usado por uma conta que não é corretor é recusado, como no cadastro aberto.
- Corretor que já comercializa esse empreendimento não gera outro pedido. A tela informa que o acesso já existe.
- Corretor já aprovado na construtora, mas sem este empreendimento, gera só o pedido deste empreendimento. Não nasce um segundo vínculo.
- Corretor com vínculo pendente nesta construtora não é duplicado. A aprovação passa a liberar também este empreendimento.
- Depois de criar a conta, o corretor entra no portal pendente, como no link aberto, até a construtora aprovar.
- Aprovar não libera os demais empreendimentos.

## Fluxos principais

1. Corretor já identificado abre o pedido na ficha. O sistema usa a conta dele e registra a solicitação pendente daquele empreendimento. O dashboard abre com a mesma sessão.
2. Visitante sem sessão escolhe **Entrar** na ficha, autentica a conta de corretor e o pedido segue como no fluxo 1.
3. Visitante sem conta escolhe **Criar conta** na ficha, preenche o cadastro aberto, fica pendente de aprovação naquele empreendimento e já entra no dashboard com a mesma sessão.
4. Construtora aprova. O corretor fica vinculado e o empreendimento aparece no dashboard dele.
5. Construtora recusa. Sem acesso ao empreendimento. Vínculo novo pendente é desfeito. Vínculo já aprovado permanece.
6. Corretor que já tem o empreendimento vê que o acesso já existe. Nada é criado.

## Integrações externas

- E-mail já enviado à construtora no pedido anônimo pode continuar como aviso. Não é a fila de aprovação.
- Sem integração nova. WhatsApp, ZapSign e pagamento ficam fora.

## Restrições e premissas

- PREMISSA: o navegador não grava cookie em `.localhost` para os subdomínios. O mesmo token Sanctum fica no site modelo e é espelhado no portal do corretor por uma ponte em `/session-bridge`. Login num lado passa a valer no outro. Sair num lado limpa os dois quando a ponte está aberta.
- PREMISSA: **Entrar** e **Criar conta** aparecem na ficha do empreendimento, no site modelo. Não há formulário anônimo de nome e telefone.
- PREMISSA: a fila continua sendo **Solicitações pendentes**. A linha mostra qual empreendimento foi pedido.
- PREMISSA: quem já existe no sistema se identifica pelo login. Não há cadastro duplicado por telefone informado solto na ficha pública.

## Riscos identificados

- Cookie no domínio `.localhost` é recusado pelo navegador, então não atravessa `www` e `corretor`. A ponte `/session-bridge` copia o token Sanctum entre os dois. Sem ela, o dashboard abre deslogado.
- Aprovar só o vínculo, como hoje, deixaria o empreendimento fechado. A aprovação desta entrada precisa conceder o empreendimento no mesmo ato.
- Dois pedidos do mesmo corretor para empreendimentos diferentes não podem apagar um ao aprovar o outro.

## Lacunas / decisões pendentes

- Nenhuma decisão de produto em aberto. As premissas acima fecham o que não foi dito literalmente.

---
**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
