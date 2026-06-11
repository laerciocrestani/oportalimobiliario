# ROADMAP — Oportalimobiliário

## Milestones

| Fase | Feature | Escopo tlc | Entrega |
|------|---------|------------|---------|
| 0 | `infra-docker` | Medium | docker-compose + bootstrap apps |
| 0 | `frontend-shell` | Large | shadcn preset + layout + dashboards base |
| 1 | `tenancy` | Large/Complex | TenantContext + middlewares + trait |
| 1 | `auth` | Large | Sanctum + login frontend/backend |
| 2 | `buildings` | Large | CRUD buildings + units |
| 2 | `reservations` | Medium | Reservation soft com expiração |
| 3 | `broker-invites` | Large/Complex | Convites + unit_access cross-tenant |
| 4 | `admin-tenants` | Medium | Gestão de construtoras |
| 5 | `public-portal` | Large | Listagem read-only + SEO |
| 6 | `subdomain-portals` | Large | Acesso por subdomínio (construtora/corretor/admin/www + api) |

## Ordem de dependências

1. `infra-docker` → bootstrap
2. `tenancy` + `frontend-shell` (paralelo após infra)
3. `auth` (após tenancy)
4. `buildings` → `reservations`
5. `broker-invites` (após buildings + auth)
6. `admin-tenants` (após tenancy)
7. `public-portal` (após buildings publicados)
8. `subdomain-portals` (após frontend-shell + auth + public-portal)

## Status atual

| Feature | Spec | Design | Tasks | Execute |
|---------|------|--------|-------|---------|
| infra-docker | done | — | done | done |
| frontend-shell | done | done | done | done |
| tenancy | done | done | done | done |
| auth | done | done | done | done |
| buildings | done | inline | inline | done |
| reservations | done | inline | inline | done |
| broker-invites | done | inline | inline | done |
| admin-tenants | done | inline | inline | done |
| public-portal | done | inline | inline | done |
| subdomain-portals | done | done | done | done |

## Próximos passos (pós-MVP v1)

- Executar `subdomain-portals` (subdomínios dev + CORS + guards FE)
- Deploy domínio `diadimoveis.com.br` (REQ-SUB-012)
- ~~Policies Spatie granulares por permission~~ → feature `builder-team` (em andamento)
- `schedule:work` ou cron em produção para expiração de reservations
