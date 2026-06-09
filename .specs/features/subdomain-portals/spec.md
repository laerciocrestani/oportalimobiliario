# Feature: subdomain-portals

## Objetivo

Migrar o escopo de acesso de perfis de **paths** (`/construtora`, `/corretor`, `/admin`, `/publico`) para **subdomínios** dedicados, mantendo a API com prefixos por perfil e o modelo de autorização existente (role + tenancy + `acessos_unidades`).

## Decisões registradas

| Decisão | Valor |
|---------|-------|
| Portal construtora | `construtora.localhost:5173` |
| Portal corretor | `corretor.localhost:5173` |
| Portal admin | `admin.localhost:5173` |
| Portal público | `www.localhost:5173` |
| API dev | `api.localhost:8000/api` |
| Auth | Bearer Sanctum + `localStorage` (sessão isolada por subdomínio) |

## Requisitos

- `REQ-SUB-001`: Cada perfil autenticado acessível por subdomínio dedicado (`construtora`, `corretor`, `admin`)
- `REQ-SUB-002`: Portal público em `www.localhost`
- `REQ-SUB-003`: API centralizada em `api.localhost:8000/api`
- `REQ-SUB-004`: Bootstrap FE detecta perfil via `window.location.hostname`
- `REQ-SUB-005`: Login em cada portal; pós-login valida `user.role === perfilDoHost`
- `REQ-SUB-006`: Rotas internas por perfil na raiz (`/`, `/login`) — sem `/construtora`, `/corretor`, `/admin`
- `REQ-SUB-007`: CORS backend permite origens dos 4 hosts FE
- `REQ-SUB-008`: `VITE_API_URL` aponta para `http://api.localhost:8000/api`
- `REQ-SUB-009`: Docker Compose e `.env.example` documentam hosts de dev
- `REQ-SUB-010`: Testes Vitest cobrem detecção de host e guard role↔host
- `REQ-SUB-011`: Paths legados (`/construtora`, `/corretor`, `/admin`) exibem mensagem orientando o subdomínio correto
- `REQ-SUB-012`: *(deferred)* Deploy produção com DNS + SSL wildcard (`construtora.`, `corretor.`, `admin.`, `www.`)

## Dependências

- `infra-docker` — Docker Compose e serviços base
- `frontend-shell` — apps por perfil e layout compartilhado
- `auth` — login Sanctum e roles

## Fora de escopo

- Tenant por subdomínio (`alpha.construtora.localhost`) — feature futura
- Cookie auth compartilhada entre subdomínios (`domain=.localhost`)
- Middleware backend validando `Host` vs `role` (hardening opcional pós-MVP)
- Alteração de prefixos API (`/api/construtora/*`, etc.)
- Alteração de middlewares de tenancy ou `acessos_unidades`

## Critérios de aceite

- [x] `construtora.localhost:5173` monta portal construtora com login e dashboard
- [x] `corretor.localhost:5173` monta portal corretor com login e dashboard
- [x] `admin.localhost:5173` monta portal admin com login e dashboard
- [x] `www.localhost:5173` monta portal público sem autenticação
- [x] `api.localhost:8000/api/health` responde OK
- [x] Login com role incorreta no host retorna erro claro (ex.: corretor em `construtora.localhost`)
- [x] CORS permite requests dos 4 hosts FE para a API
- [x] `pnpm test` e `php artisan test` passando
- [x] README documenta URLs e `/etc/hosts` fallback

## Rastreabilidade

| REQ | Componente |
|-----|------------|
| REQ-SUB-001–006 | `frontend/src/lib/profile.ts`, `App.tsx`, `ProfileGuard.tsx`, `LoginPage.tsx` |
| REQ-SUB-007 | `backend/config/cors.php`, `docker-compose.yml` |
| REQ-SUB-008–009 | `docker-compose.yml`, `.env.example`, `vite.config.ts` |
| REQ-SUB-010 | `profile.test.ts`, `LoginPage.test.tsx`, `ProfileGuard.test.tsx` |
| REQ-SUB-011 | `App.tsx` fallback para `localhost:5173` sem subdomínio reconhecido |
