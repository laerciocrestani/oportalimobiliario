# Dev access — portais e credenciais

Checklist manual para desenvolvimento e smoke tests.  
Dados resumidos em [`.specs/codebase/SEEDS.md`](../.specs/codebase/SEEDS.md).

## Hosts (`/etc/hosts`)

Chrome resolve `*.localhost` automaticamente. Em outros browsers:

```
127.0.0.1 construtora.localhost corretor.localhost admin.localhost www.localhost api.localhost
```

## URLs

| Portal | URL |
|--------|-----|
| Construtora | http://construtora.localhost:5173 |
| Corretor | http://corretor.localhost:5173 |
| Admin SaaS | http://admin.localhost:5173 |
| Público | http://www.localhost:5173 |
| API | http://api.localhost:8000 |

## Popular banco

```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
```

**Senha de todos os usuários demo:** `password`

> Evitar `migrate:fresh` sem pedido explícito — apaga dados locais.

## Credenciais rápidas

| Email | Role | Portal |
|-------|------|--------|
| `construtora@alpha.demo` | builder (todas permissões) | construtora |
| `comercial@alpha.demo` | builder (view + convites) | construtora |
| `supervisor@alpha.demo` | builder (status + reservas) | construtora |
| `construtora@beta.demo` | builder (tenant beta) | construtora |
| `corretor@demo.com` | broker | corretor |
| `admin@oportalimobiliario.com.br` | admin | admin |

## Checklist manual

1. **Construtora** — http://construtora.localhost:5173/login → `construtora@alpha.demo` → `/buildings` lista empreendimentos.
2. **Corretor** — http://corretor.localhost:5173/login → `corretor@demo.com` → `/buildings` mostra unidades com acesso.
3. **Cross-portal** — `corretor@demo.com` em `construtora.localhost` → erro de role (ProfileGuard).
4. **Isolamento tenant** — login beta não vê buildings da alpha.
5. **Admin** — http://admin.localhost:5173/login → `admin@oportalimobiliario.com.br` → lista tenants.
6. **Impersonate** — admin escolhe usuário da equipe → redireciona para `/auth/impersonate` na construtora.
7. **Público** — http://www.localhost:5173/ → listagem sem login (apenas `published=true`).
8. **Reservas** — corretor cria reserva em unidade disponível → aparece em `/reservations` nos dois portais.
9. **Contratos** — `construtora@alpha.demo` → menu **Contratos** (`/contracts`) cadastra modelos; na reserva com dados enviados, **Emitir contrato** gera o PDF. Corretor vê/baixa no andamento.

## Login via API (debug)

```bash
curl -s -X POST http://api.localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"construtora@alpha.demo","password":"password"}'
```

## Testes automatizados

```bash
docker compose exec backend php artisan test --compact
docker compose exec frontend pnpm test
```

Testes usam SQLite em memória — não dependem destes seeds.
