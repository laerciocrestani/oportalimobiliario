# ROADMAP — Oportalimobiliário

## Milestones

| Fase | Feature | Escopo tlc | Entrega |
|------|---------|------------|---------|
| 0 | `infra-docker` | Medium | docker-compose + bootstrap apps |
| 0 | `frontend-shell` | Large | shadcn preset + layout + dashboards base |
| 1 | `tenancy` | Large/Complex | TenantContext + middlewares + trait |
| 1 | `auth` | Large | Sanctum + login frontend/backend |
| 2 | `empreendimentos` | Large | CRUD empreendimentos + unidades |
| 2 | `reservas` | Medium | Reserva soft com expiração |
| 3 | `corretor-convites` | Large/Complex | Convites + acessos cross-tenant |
| 4 | `admin-tenants` | Medium | Gestão de construtoras |
| 5 | `portal-publico` | Large | Listagem read-only + SEO |

## Ordem de dependências

1. `infra-docker` → bootstrap
2. `tenancy` + `frontend-shell` (paralelo após infra)
3. `auth` (após tenancy)
4. `empreendimentos` → `reservas`
5. `corretor-convites` (após empreendimentos + auth)
6. `admin-tenants` (após tenancy)
7. `portal-publico` (após empreendimentos publicados)

## Status atual

| Feature | Spec | Design | Tasks | Execute |
|---------|------|--------|-------|---------|
| infra-docker | pending | — | pending | pending |
| frontend-shell | pending | pending | pending | pending |
| tenancy | pending | pending | pending | pending |
| auth | pending | pending | pending | pending |
| empreendimentos | pending | pending | pending | pending |
| reservas | pending | inline | pending | pending |
| corretor-convites | pending | pending | pending | pending |
| admin-tenants | pending | inline | pending | pending |
| portal-publico | pending | pending | pending | pending |
