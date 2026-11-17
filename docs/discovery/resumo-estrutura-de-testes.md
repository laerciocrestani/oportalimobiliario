# Resumo do Entendimento — Estrutura de testes do Oportalimobiliário

## Problema e objetivo

O Oportalimobiliário já prova a API com Pest e o componente com Vitest e React Testing Library. Não há pipeline no GitHub Actions, não há Playwright e o portal público em `sites/` não tem suíte. O Compose de desenvolvimento sobe Postgres, fila e scheduler para uso manual. A suíte automatizada não usa esse Postgres.

O objetivo é a mesma pirâmide do Acadesis, ajustada a este repositório: um dono único para cada afirmação, três verificações que decidem se o commit está pronto para merge, e nenhuma chamada a API publicada nem a serviço externo. Publicar é outro workflow e fica de fora até existir alvo.

## Sistema existente

- Backend Laravel 13, API-only, Pest, Sanctum, Spatie Permission com teams. `docker compose exec backend php artisan test`. SQLite em memória forçado em `backend/tests/Pest.php` e `backend/phpunit.xml`, para o `RefreshDatabase` não atingir o Postgres de desenvolvimento. Cerca de 90 arquivos em `backend/tests`, Feature e Unit.
- Frontend React 19, Vite, pnpm, Vitest 3 com `environment: 'jsdom'`, Testing Library e `*.test.tsx` já renderizando componente. Comando local: `docker compose exec frontend pnpm test`.
- Portal público em `sites/` (Astro SSR, porta 4321). Script atual: `astro check`. Sem Vitest e sem Playwright.
- Portais de dev: `construtora.localhost:5173` (builder), `corretor.localhost:5173` (broker), `admin.localhost:5173` (admin), `www.localhost:4321` (Astro), `api.localhost:8000`. Sessão por Bearer em `localStorage` isolado por subdomínio.
- Contrato publicado em `docs/api/openapi.yaml`. Feature test cobre happy path, 401/403, 422 e isolamento de tenant.
- Compose local: Postgres 16, backend, frontend, queue, scheduler, sites. Não há `.github/workflows`.
- Integrações já presentes no código: ViaCEP, busca de índice INCC, webhook de WhatsApp, e-mail e geração de PDF.

O que permanece: domínio imobiliário (empreendimento, unidade, reserva, proposta, contrato, convite, portal público). Pest e Testing Library já escritos. SQLite em memória. OpenAPI como contrato publicado. Comandos do dia a dia via `docker compose exec`. Chromium local, sem browser na nuvem.

## Restrições organizacionais

- Time, prazo e orçamento não foram informados. PREMISSA: não mudam esta estrutura.
- Sem licença nova. Pest, Vitest, Testing Library e Playwright são código aberto. O frontend e o `sites/` continuam em pnpm.

## Atores

- Quem desenvolve: escreve o teste na camada dona da falha e roda Pest e Vitest pelo Compose. A jornada de browser usa o mesmo boot isolado do CI.
- GitHub Actions: sobe um ambiente descartável no runner, executa as três verificações e informa se o commit está pronto para merge.
- Ruleset do GitHub na `main`: exige pull request e os três checks. Sem eles, o merge fica bloqueado.
- Usuários semeados de teste: corretor, construtora e o empreendimento publicado do portal público. Existem só no SQLite daquele run. Não são conta de produção nem secret de ambiente publicado. A testemunha é permissão no usuário da construtora, não um terceiro portal.

## Requisitos funcionais

1. Manter a suíte Pest atual. Não há reescrita de PHPUnit. `php artisan test` continua sendo o comando, no Compose no dia a dia e no runner no CI.
2. O comportamento executável da API é o teste de Feature: campos, tipos, JSON, código HTTP, autenticação, permissão e isolamento de tenant. O `docs/api/openapi.yaml` continua obrigatório quando o endpoint muda. Ele não vira quarta suíte nem quarto check de merge.
3. Teste de Unit em Pest fica para regra pura ou ramo de Service que o HTTP não alcança com clareza. Relacionamento de Model e endpoint não ganham suíte paralela quando o Feature já os cobre.
4. Manter Vitest e React Testing Library para comportamento de componente. Funções puras em `src/lib` continuam em Vitest, sem renderizar componente. Não há reescrita de teste que já renderiza.
5. No componente, a HTTP é falsa: respostas da API, do ViaCEP e das demais integrações entram como mock. O teste cobre validação, loading, erro, evento, permissão visível na tela e dado da API desenhado na interface.
6. Playwright cobre duas jornadas na primeira leva, contra Laravel, Vite e Astro reais:
   - Corretor cria a pré-reserva e envia a proposta. A construtora vê no kanban e aceita. O corretor vê o aceite. São dois contextos de browser (`corretor.localhost` e `construtora.localhost`), porque o token não atravessa o subdomínio.
   - Visitante abre `sites/` e vê um empreendimento publicado.
7. Fluxo novo de browser só entra quando Pest e Testing Library não conseguem ver a falha. Ficam no Pest, nesta etapa: ramos 401/403/422, isolamento de tenant, PDF, testemunha, WhatsApp, INCC e a espera de 10 minutos ou 48 horas.
8. O mesmo boot isolado vale no notebook e no Actions: API Laravel em SQLite semeado, Vite, Astro e Chromium. ViaCEP, INCC e WhatsApp são interceptados. Não há credencial de produção.
9. O workflow de qualidade tem três jobs obrigatórios: Pest, Vitest, Playwright. Os três bloqueiam o merge na `main`.
10. `sites/` entra na jornada pública do Playwright. `astro check` não é check de merge.
11. O workflow de publicação é separado. Nesta etapa ele não publica. O alvo `diadimoveis.com.br` continua adiado.
12. A ruleset do repositório faz parte desta etapa: pull request obrigatório para a `main` e os três status checks exigidos. O arquivo de workflow só publica o status. O bloqueio é a ruleset.

## Requisitos não funcionais

- Pest roda no runner com PHP e SQLite em memória, sem Postgres e sem container. O job força `APP_ENV=testing` e `DB_CONNECTION=sqlite`, no mesmo espírito de `Pest.php` e `phpunit.xml`.
- Vitest roda em jsdom, sem browser e sem processo Laravel.
- Playwright sobe API, Vite e Astro dentro do job. Sem chamada a `viacep.com.br`, sem busca real de INCC, sem WhatsApp externo, sem API já deployada, sem secret de usuário real.
- Um browser: Chromium.
- Sem meta de cobertura percentual.
- Sem tempo máximo numérico de pipeline. Postgres, fila, scheduler e rede externa ficam de fora para o job não depender deles.
- O teste de browser não espera o TTL de pré-reserva nem a janela de 48 horas do sinal.

## Regras de negócio

- Cada comportamento tem uma camada dona. As outras não repetem a mesma prova.
- Dono da regra de cadastro, permissão, persistência, tenant e formato JSON: Pest Feature.
- Dono do contrato publicado para consumidores da API: `docs/api/openapi.yaml`. Mudança de endpoint atualiza o YAML e o Feature test. O YAML não reexecuta a suíte.
- Dono do comportamento de componente isolado: Vitest + Testing Library.
- Dono da jornada no browser, com React ou Astro e Laravel no mesmo fluxo: Playwright.
- Regressão de bug nasce na camada mais baixa que reproduz a falha.
- `RefreshDatabase` só em SQLite em memória.
- O usuário do E2E existe só no banco criado para aquele run.
- A passagem corretor → construtora é o motivo das duas origens no Playwright. A matriz de erros dessa reserva não entra no browser.
- Admin fica no Pest e no Vitest até existir uma falha que essas camadas não vejam.

## Fluxos principais

1. Pull request para a `main` dispara o workflow de qualidade. Pest, Vitest e Playwright rodam em paralelo no runner. Playwright sobe `php artisan serve` com SQLite e seed, sobe o Vite dos portais, sobe o Astro do portal público, abre dois contextos na jornada da reserva, intercepta ViaCEP, INCC e WhatsApp, e executa as duas jornadas. Os três jobs verdes são a condição de merge.
2. Falha em qualquer job deixa o pull request fora dessa condição. A ruleset bloqueia o merge. Nada é publicado por esse workflow.
3. Push direto na `main` também fica bloqueado pela ruleset. O caminho é o pull request com os três checks.
4. No desenvolvimento, `docker compose exec backend php artisan test` e `docker compose exec frontend pnpm test` não sobem browser. O comando de E2E sobe a mesma API isolada do CI, com SQLite, no lugar do Postgres do Compose.
5. O workflow também roda em push na `main`, para o status existir depois do merge.
6. Publicação, quando o alvo existir, é outro workflow, disparado só com os três jobs verdes.

## Integrações externas

- ViaCEP (`https://viacep.com.br/ws/{cep}/json/`): mock no componente, `Http::fake` no Pest, rota interceptada no Playwright. O teste não consulta a rede.
- INCC: a busca externa não sai do CI. O índice usado na jornada, quando precisar existir, vem do seed.
- WhatsApp: webhook e envio não saem do CI.
- E-mail: driver de teste em memória, como já está no `phpunit.xml` (`MAIL_MAILER=array`).
- API Laravel: Pest fala com ela in-process. Playwright fala com um processo levantado no job. Testing Library não abre socket para ela.
- Postgres do Compose: permanece para o uso manual do sistema. Fora da suíte e fora do CI.
- Publicação (`diadimoveis.com.br`): não faz parte desta suíte.

## Restrições e premissas

- PREMISSA: o CI não usa Docker Compose. O Compose continua sendo o ambiente de desenvolvimento e o meio dos comandos locais de Pest e Vitest.
- PREMISSA: o comando de E2E local reproduz o runner (PHP, pnpm, Chromium e SQLite no host), para o notebook e o Actions terem o mesmo boot. Essa é a exceção à regra de `docker compose exec`, limitada a essa jornada.
- PREMISSA: a frase "testes de integração que verificam o consumo real da API" não vira quarta suíte. Esse consumo é o Playwright.
- PREMISSA: pnpm permanece. Não há migração para npm.
- PREMISSA: não se reescreve Pest nem os testes de componente que já usam Testing Library.
- PREMISSA: a reserva até a unidade vendida, com PDF e testemunha, fica no Pest. A Testing Library cobre ramos de UI. O Playwright cobre a passagem visível entre corretor e construtora e a leitura pública do empreendimento.
- PREMISSA: sem percentual mínimo de cobertura.
- PREMISSA: `astro check` e o OpenAPI não entram na tabela de bloqueio. A tabela de merge é só Pest, Vitest e Playwright.
- PREMISSA: time, prazo e orçamento desconhecidos não alteram o desenho.
- Nomes dos checks exigidos pela ruleset: `Pest`, `Vitest`, `Playwright`.

## Riscos identificados

- Playwright voltar a afirmar o que o Pest já cobre. Mitigação: a regra da camada dona e o recorte das duas jornadas.
- E2E instável por CEP, INCC, WhatsApp, credencial, Postgres ou relógio de 48 horas. Mitigação: SQLite semeado, integrações interceptadas e nenhum sleep de TTL.
- Dois portais com `localStorage` separado fazerem o spec parecer um login só. Mitigação: dois contextos de browser na jornada da reserva.
- Comando do CI diferente do comando do dia a dia. Mitigação: `Pest.php` e `phpunit.xml` já forçam SQLite antes do boot. O job repete `APP_ENV=testing` e `DB_CONNECTION=sqlite`.
- O workflow ficar verde e o merge continuar liberado porque a ruleset não exige o nome exato do check. Mitigação: a ruleset referencia `Pest`, `Vitest` e `Playwright`, iguais aos nomes dos jobs.
- jsdom não vê foco, layout nem a passagem entre portais. Aceito: isso é papel do Playwright, e só nas duas jornadas.
- Publicar sem alvo definido geraria um workflow que finge deploy. Mitigação: o workflow de publicação fica de fora até o alvo existir.
- `sites/` hoje não tem teste de comportamento. Mitigação: a primeira prova dele é a jornada pública no Playwright, lendo dado semeado na API.

## Lacunas / decisões pendentes

- Alvo de publicação do backend, do frontend e do `sites/`. Sem isso, o workflow de publicação não será desenhado.
- Jornadas de browser além das duas desta etapa, inclusive admin. Entram depois, pela regra da camada mais baixa.
- Tamanho do time e prazo. Não mudam a estrutura acima.

---
Implementado na branch `ci/estrutura-de-testes`. A ruleset da `main` fica em `.github/rulesets/main-quality.json` e só deve ser aplicada depois que o workflow estiver na `main`.
