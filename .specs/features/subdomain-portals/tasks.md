# Tasks: subdomain-portals

## Fase A — Specs e governança

- [x] [ORCH] spec.md + design.md + tasks.md
- [x] [ORCH] Atualizar ROADMAP.md, ARCHITECTURE.md, INTEGRATIONS.md, STATE.md

## Fase B — Infra (REQ-SUB-008, REQ-SUB-009)

- [x] [BE] `docker-compose.yml`: `APP_URL`, `CORS_ALLOWED_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS`
- [x] [FE] `docker-compose.yml`: `VITE_API_URL=http://api.localhost:8000/api`
- [x] [ORCH] `.env.example` e `backend/.env.example` com hosts documentados
- [x] [FE] `vite.config.ts`: `server.host` + `allowedHosts` para subdomínios
- [x] [ORCH] README quick start com URLs por portal e `/etc/hosts` fallback

**Verificação:** `docker compose up -d` sobe sem erro; README lista 5 URLs de dev.

## Fase C — Backend CORS (REQ-SUB-007)

- [x] [BE] Publicar `backend/config/cors.php` lendo `CORS_ALLOWED_ORIGINS`
- [x] [BE] Feature test Pest: preflight OPTIONS com origem `http://construtora.localhost:5173`

**Verificação:** `docker compose exec backend php artisan test --compact --filter=Cors`

## Fase D — Frontend bootstrap (REQ-SUB-001–006, REQ-SUB-011)

- [x] [FE] `frontend/src/lib/profile.ts` + `profile.test.ts`
- [x] [FE] `frontend/src/components/auth/ProfileGuard.tsx` + teste
- [x] [FE] Refatorar `App.tsx`: router condicional por host
- [x] [FE] Ajustar `LoginPage.tsx`: validação role↔host, redirect `/`
- [x] [FE] Atualizar `dashboard-nav.tsx`: URLs `/` em vez de paths por perfil
- [x] [FE] `api.ts`: default `http://api.localhost:8000/api` + `fetchMe` + `clearToken`
- [x] [FE] `PortalGuidePage` + `LegacyPathNotice` para hosts/paths legados

**Verificação:** cada subdomínio monta apenas seu app; login com role errada falha.

## Fase E — Testes e validação (REQ-SUB-010)

- [x] [FE] Vitest: `profile.ts`, `LoginPage` role mismatch, `ProfileGuard`
- [x] [QA] `docker compose exec frontend pnpm test && pnpm build`
- [x] [QA] `docker compose exec backend php artisan test`

### Smoke manual

- [ ] `http://construtora.localhost:5173/login` → `construtora@alpha.demo` / `password` → dashboard
- [ ] `http://corretor.localhost:5173/login` → `corretor@demo.com` / `password` → unidades
- [ ] `http://admin.localhost:5173/login` → `admin@oportalimobiliario.com.br` / `password` → tenants
- [ ] `http://www.localhost:5173` → listagem pública sem login
- [ ] `http://api.localhost:8000/api/health` → `{ "status": "ok" }`
- [ ] Login `corretor@demo.com` em `construtora.localhost` → erro "Conta não autorizada neste portal"
- [ ] `http://localhost:5173` → página de orientação com links

**Gate final:** testes automatizados passando (39 BE + 15 FE). Smoke manual pendente validação humana.
