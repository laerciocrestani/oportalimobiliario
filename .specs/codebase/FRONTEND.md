# Frontend — rotas, portais e convenções

## Detecção de perfil

`frontend/src/lib/profile.ts` mapeia hostname → profile key:

| Hostname (dev) | Profile | Autenticado |
|----------------|---------|-------------|
| `construtora.localhost` | `builder` | sim |
| `corretor.localhost` | `broker` | sim |
| `admin.localhost` | `admin` | sim |
| `www.localhost` | `public` | não |
| `localhost` (sem subdomínio) | — | `PortalGuidePage` |

Bootstrap em `App.tsx`: escolhe `AuthenticatedPortal`, `PublicPortal` ou `UnknownHostPortal`.

## Rotas por portal

Definidas em `frontend/src/App.tsx`.

### Builder (`construtora.localhost`)

| Rota | Página | API principal |
|------|--------|---------------|
| `/login` | `LoginPage` | `authApi.login` |
| `/` | `BuilderHome` | — |
| `/buildings` | `BuildingsPage` | `builderApi.getBuildings` |
| `/buildings/new` | `BuildingWizardPage` | `builderApi.createBuilding`, `lookupCep` |
| `/buildings/:id/wizard` | `BuildingWizardPage` | `builderApi.getBuilding` / `updateBuilding` / `replaceBuildingStructure` / `replaceBuildingUnitGrid` / `listAmenities` / `generateBuildingDescription` |
| `/buildings/:id` | `BuildingDetailPage` | `builderApi.getBuilding` |
| `/buildings/:id/edit` | `BuildingEditPage` | `builderApi.updateBuilding` |
| `/team` | `TeamPage` | `builderApi.*` team |
| `/invites` | `InvitesPage` | `builderApi.*` invites |
| `/reservations` | `ReservationsPage` | `builderApi.getReservations` |
| `/contracts` | `ContractsPage` | `builderApi.listContractTemplates` / `issueContract` |
| `/activity` | `ActivityPage` | `builderApi.listActivity` / `listActivityMembers` |
| `/auth/impersonate` | `ImpersonatePage` | `authApi.exchangeImpersonation` |

### Broker (`corretor.localhost`)

| Rota | Página | API principal |
|------|--------|---------------|
| `/login` | `LoginPage` | `authApi.login` |
| `/` | `BrokerOverviewPage` | — |
| `/buildings` | `BrokerBuildingsPage` | `brokerApi.getUnits` |
| `/clients` | `BrokerClientsPage` | `brokerApi.getClients` |
| `/reservations` | `BrokerReservationsPage` | `brokerApi.getReservations` |
| `/invite/:token` | `InviteAcceptPage` | `brokerApi.acceptInvite` |
| `/activity` | `ActivityPage` | `brokerApi.listActivity` |

### Admin (`admin.localhost`)

| Rota | Página | API principal |
|------|--------|---------------|
| `/login` | `LoginPage` | `authApi.login` |
| `/` | `AdminHome` | `adminApi.getTenants` |
| `/tenants/:id/edit` | `TenantEditPage` | `adminApi.updateTenant` |
| `/incc` | `InccIndicesPage` | `adminApi.listInccIndices` / `createInccIndex` / `updateInccIndex` / `getInccHint` |
| `/amenities` | `AmenitiesPage` | `adminApi.listAmenities` / `createAmenity` / `updateAmenity` |
| `/activity` | `ActivityPage` | `adminApi.listActivity` / `exportActivity` |

### Público (`www.localhost`)

| Rota | Página | API principal |
|------|--------|---------------|
| `/` | `PublicHome` (SPA legado) | `publicApi.listBuildings` / `getBuilding` |
| `/` + `/empreendimentos/:slug` | portal `sites/` (Astro SSR, `:4321`) | `GET /api/public/buildings` |

O portal público de produção é `sites/` (`www.localhost:4321`). O SPA em `www.localhost:5173` permanece para smoke interno.

## Navegação (sidebar)

Config estática em `frontend/src/config/dashboard-nav.tsx`.  
Shells que consomem:

- `apps/builder/components/BuilderDashboardShell.tsx`
- `apps/broker/components/BrokerDashboardShell.tsx`
- `components/layout/DashboardShell.tsx` (admin)

Badges dinâmicos (ex.: reservas pendentes) injetados nos shells, não no `dashboard-nav.tsx`.

## Cliente HTTP

`frontend/src/lib/api.ts` — **único ponto** de chamadas API:

| Export | Perfil | Prefixo |
|--------|--------|---------|
| `authApi` | todos autenticados | `/api/auth/*` |
| `builderApi` | builder | `/api/builder/*` |
| `brokerApi` | broker | `/api/broker/*` |
| `adminApi` | admin | `/api/admin/*` |
| `publicApi` | público | `/api/public/*` |

- Base URL: `VITE_API_URL` (default `http://api.localhost:8000/api`)
- Token: `localStorage` key `opim_token` (isolado por origin/subdomínio)
- Tipos TS (`Building`, `Unit`, `Reservation`, etc.) definidos neste arquivo

## Auth guard

`components/auth/ProfileGuard.tsx`:

1. Redireciona para `/login` se sem token.
2. Valida `user.role === profile` do host (ex.: broker em `corretor.localhost`).

## Estrutura de apps

```
frontend/src/apps/
├── auth/       # Login, impersonate, portal guide
├── builder/    # Portal construtora
├── broker/     # Portal corretor
├── admin/      # Admin SaaS
└── public/     # Portal público
```

Componentes compartilhados: `frontend/src/components/` (ui shadcn + auth + layout).

## Convenções FE

- TypeScript strict; testes em `*.test.tsx` ao lado do componente
- shadcn: adicionar via CLI dentro do container (`docker compose exec frontend ...`)
- Não usar `fetch` direto — sempre `*Api` de `lib/api.ts`
- Permissões builder: `use-builder-permissions.ts` + `lib/builder-permissions.ts`

## Testes

```bash
docker compose exec frontend pnpm test
```

Cobertura mínima: login, guards, fluxos com interação (formulários, dialogs).
