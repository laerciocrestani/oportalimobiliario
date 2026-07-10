# Traceability — REQ → código

Índice para localizar implementação sem grep no repositório inteiro.  
Specs completas em `.specs/features/<feature>/spec.md`.

## Legenda

- **BE** = backend
- **FE** = frontend
- **—** = não aplicável ou inline na spec

---

## infra-docker

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-INFRA-001 | docker-compose serviços | `docker-compose.yml` | `docker-compose.yml` | — |
| REQ-INFRA-002 | PostgreSQL 16 | `docker-compose.yml` | — | — |
| REQ-INFRA-003 | Laravel API + Pest | `backend/` | — | `backend/tests/Feature/Api/HealthTest.php` |
| REQ-INFRA-004 | React + Vite + pnpm | — | `frontend/` | `frontend/vitest.config.ts` |
| REQ-INFRA-005 | `.env.example` | `.env.example` | `.env.example` | — |
| REQ-INFRA-006 | Comandos via Docker | `README.md`, `.cursor/rules/docker-exec.mdc` | idem | — |
| REQ-INFRA-007 | README quick start | `README.md` | `README.md` | — |

---

## tenancy

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-TEN-001 | TenantContext | `app/Tenancy/TenantContext.php` | — | `tests/Unit/Tenancy/TenantContextTest.php` |
| REQ-TEN-002 | BelongsToTenant | `app/Tenancy/Concerns/BelongsToTenant.php` | — | `tests/Unit/Tenancy/BelongsToTenantTest.php` |
| REQ-TEN-003 | SetTenantFromUser | `app/Tenancy/Middleware/SetTenantFromUser.php` | — | `tests/Feature/Tenancy/TenantIsolationTest.php` |
| REQ-TEN-004 | EnsureNoTenantContext (broker) | `app/Tenancy/Middleware/EnsureNoTenantContext.php` | — | `tests/Feature/Tenancy/TenantIsolationTest.php` |
| REQ-TEN-005 | Isolamento entre tenants | `bootstrap/app.php` (middleware priority) | — | `tests/Feature/Tenancy/TenantIsolationTest.php` |
| REQ-TEN-006 | TenantAwareJob | `app/Tenancy/Concerns/TenantAwareJob.php` | — | `tests/Unit/Tenancy/TenantAwareJobTest.php` |

---

## auth

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-AUTH-001 | Login Sanctum | `app/Http/Controllers/Api/AuthController.php` | `apps/auth/LoginPage.tsx` | `tests/Feature/Auth/LoginTest.php` |
| REQ-AUTH-002 | Roles admin/builder/broker | `database/seeders/RolePermissionSeeder.php` | — | `LoginTest.php` |
| REQ-AUTH-003 | Spatie teams = tenant_id | `SetPermissionsTeamId.php` | — | `tests/Feature/Builder/AuthorizationTest.php` |
| REQ-AUTH-004 | POST /api/auth/login | `AuthController.php`, `routes/api.php` | `lib/api.ts` | `LoginTest.php` |
| REQ-AUTH-005 | GET /api/auth/me | `AuthController.php` | `lib/api.ts` | `AuthorizationTest.php` |
| REQ-AUTH-006 | Tela login FE | — | `apps/auth/LoginPage.tsx` | `LoginPage.test.tsx` |

---

## buildings

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-EMP-001 | CRUD buildings | `Builder/BuildingController.php` | `apps/builder/BuildingsPage.tsx`, `BuildingDetailPage.tsx`, `BuildingEditPage.tsx` | `tests/Feature/Buildings/BuildingTest.php` |
| REQ-EMP-002 | CRUD units | `Builder/UnitController.php` | `components/UnitsTable.tsx`, `UnitCreateDialog.tsx`, `UnitDetailDrawer.tsx` | `BuildingTest.php` |
| REQ-EMP-003 | UnitStatus enum | `app/Enums/UnitStatus.php` | `lib/unit-status.ts` | `BuildingTest.php` |
| REQ-EMP-004 | Flag published | `BuildingController.php` | `BuildingEditForm.tsx` | `BuildingTest.php`, `Public/BuildingTest.php` |
| REQ-EMP-005 | Seeders + testes | `BuildingSeeder.php`, `UnitSeeder.php` | — | `BuildingTest.php`, `Seeders/BuildingMediaSeederTest.php` |

**Torres e mídia** (extensão de buildings):

| Área | BE | FE | Testes |
|------|----|----|--------|
| Torres | `Builder/TowerController.php` | `TowerEditSheet.tsx` | `tests/Feature/Buildings/TowerTest.php` |
| Mídia | `Builder/BuildingMediaController.php` | `BuildingMediaGallery.tsx` | `tests/Feature/Buildings/BuildingMediaTest.php` |

---

## reservations

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-RES-001 | Criar reserva (broker) | `Broker/ReservationController.php` | `BrokerReservationDialog.tsx` | `tests/Feature/Reservations/ReservationTest.php` |
| REQ-RES-002 | Expiração automática | `Services/ReservationExpirationService.php`, `Console/Commands/ExpireReservations.php` | — | `ReservationTest.php` |
| REQ-RES-003 | TTL em config | `config/opim.php` | — | `ReservationTest.php` |
| REQ-RES-004 | ReservationSeeder | `database/seeders/ReservationSeeder.php` | — | `ReservationTest.php` |
| REQ-RES-005 | Pré-reserva (pre-hold) | `PreReservationService.php`, `Broker/ReservationController.php` | `BrokerUnitsDialog.tsx` | `PreReservationTest.php` |
| REQ-RES-006 | Confirmar pre-hold | `PreReservationService.php`, `Broker/ReservationController.php` | `BrokerReservationDialog.tsx` | `PreReservationTest.php` |
| REQ-RES-007 | Liberar pre-hold | `PreReservationService.php`, `Broker/ReservationController.php` | `BrokerReservationDialog.tsx` | `PreReservationTest.php` |
| REQ-RES-008 | Expirar pre-holds | `ExpirePreReservations.php`, `routes/console.php` | — | `PreReservationTest.php` |
| REQ-RES-009 | Polling + toast FE | — | `lib/reservation-polling.ts`, `BrokerUnitsDialog.tsx` | `reservation-polling.test.ts` |

---

## reservation-timeline

> Spec: `.specs/features/reservation-timeline/spec.md` · Design: `design.md` · Status: **specified** (não implementado)

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-RTL-001..004 | Pré-reserva + diálogo no timeline | `ReservationTimelineService.php`, controllers timeline | `ReservationTimeline.tsx`, `ReservationTimelineSheet.tsx` | `ReservationTimelineTest.php`, `ReservationTimeline.test.tsx` |
| REQ-RTL-024..028 | GET timeline API + UI | `Broker/ReservationTimelineController.php`, `Builder/ReservationTimelineController.php` | `BrokerReservationsPage.tsx`, `ReservationsPage.tsx` | `ReservationTimelineTest.php` |
| REQ-RTL-029 | Eventos append-only | `ReservationTimelineEvent.php`, hooks em `PreReservationService` + messages | — | `ReservationTimelineTest.php` |
| REQ-RTL-005..023 | Proposta + sinal + contrato | — (Fase B–D) | — | — |

---

## builder-reservations

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-BLD-RES-001 | Nav Reservas builder | — | `config/dashboard-nav.tsx`, `BuilderDashboardShell.tsx` | `ReservationsPage.test.tsx` |
| REQ-BLD-RES-002 | Listagem builder | `Builder/ReservationController.php` | `apps/builder/ReservationsPage.tsx` | `tests/Feature/Builder/ReservationTest.php` |
| REQ-BLD-RES-003 | Cancelar + mensagens | `Builder/ReservationMessageController.php` | `ReservationMessagesDialog.tsx` | `Builder/ReservationTest.php` |
| REQ-BLD-RES-004 | observations na criação | `Broker/ReservationController.php` | `BrokerReservationDialog.tsx` | `ReservationTest.php` |
| REQ-BLD-RES-005 | Thread broker | `Broker/ReservationMessageController.php` | `BrokerReservationsPage.tsx` | `Builder/ReservationTest.php` |
| REQ-BLD-RES-006 | Listagem broker | `Broker/ReservationController.php` | `BrokerReservationsPage.tsx` | `ReservationTest.php` |
| REQ-BLD-RES-007 | Badge pending-replies | `pendingRepliesCount` endpoints | `BuilderDashboardShell.tsx`, `BrokerDashboardShell.tsx` | `BrokerReservationsPage.test.tsx` |

---

## broker-invites

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-CONV-001 | Criar convite | `Builder/BrokerInviteController.php` | `apps/builder/InvitesPage.tsx` | `tests/Feature/Broker/InviteTest.php` |
| REQ-CONV-002 | Aceitar convite | `Broker/BrokerInviteController.php` | `apps/broker/InviteAcceptPage.tsx` | `InviteTest.php` |
| REQ-CONV-003 | unit_access (legado) | `Models/UnitAccess.php` | — | `InviteTest.php` |
| REQ-CONV-004 | Rotas broker sem tenant scope | `routes/api.php` (grupo broker) | — | `InviteTest.php` |
| REQ-CONV-005 | Seeders | `BrokerInviteSeeder.php`, `UnitAccessSeeder.php`, `BuildingAccessSeeder.php` | — | — |
| REQ-CONV-006 | broker_tenants no aceite | `BrokerInviteService.php` | — | `InviteTest.php` |
| REQ-CONV-007 | building_access | `Builder/BuildingAccessController.php` | `InvitesPage.tsx` | `tests/Feature/Broker/BuildingAccessTest.php` |
| REQ-CONV-008 | Registro no aceite | `Broker/BrokerInviteController.php` | `InviteAcceptPage.tsx` | `InviteTest.php` |
| REQ-CONV-009 | E-mail + invite_url | `Mail/BrokerInviteMail.php` | — | `InviteTest.php` |
| REQ-CONV-010 | UI /invites | — | `InvitesPage.tsx` | `InvitesPage.test.tsx` |
| REQ-CONV-011 | UI /invite/:token | — | `InviteAcceptPage.tsx` | `InviteAcceptPage.test.tsx` |

---

## broker-dashboard

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-BRK-DASH-001 | Nav corretor | — | `dashboard-nav.tsx`, `BrokerDashboardShell.tsx` | — |
| REQ-BRK-DASH-002 | Overview KPIs mock | — | `BrokerOverviewPage.tsx` | — |
| REQ-BRK-DASH-003 | Cards + dialogs | `Broker/UnitController.php` | `BrokerBuildingsPage.tsx`, `BrokerUnitsDialog.tsx` | — |
| REQ-BRK-CLI-001 | CRUD clientes | `Broker/ClientController.php` | `BrokerClientsPage.tsx`, `BrokerNewClientDialog.tsx` | `tests/Feature/Broker/ClientTest.php` |
| REQ-BRK-CLI-002 | Cliente inline na reserva | — | `BrokerReservationDialog.tsx` | `BrokerNewClientDialog.test.tsx` |
| REQ-BRK-RES-001 | Reserva com client_id | `Broker/ReservationController.php` | `BrokerReservationDialog.tsx` | `ReservationTest.php` |
| REQ-BRK-RES-002 | Acesso via BuildingAccess ou UnitAccess | `BrokerUnitAccessService.php` | — | `BuildingAccessTest.php` |
| REQ-BRK-RES-003 | Cancelamento pelo corretor | `Broker/ReservationController.php` | `BrokerUnitsDialog.tsx`, `BrokerReservationsPage.tsx` | `ReservationTest.php` |

---

## builder-team

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-TEAM-001 | Catálogo permissions | `app/Support/BuilderPermissions.php` | `lib/builder-permissions.ts` | `AuthorizationTest.php` |
| REQ-TEAM-002 | SetPermissionsTeamId | `SetPermissionsTeamId.php` | — | `AuthorizationTest.php` |
| REQ-TEAM-003 | CRUD /api/builder/team | `Builder/TeamMemberController.php` | `apps/builder/TeamPage.tsx` | `tests/Feature/Builder/TeamTest.php` |
| REQ-TEAM-004 | Cancelar reserva builder | `Builder/ReservationController.php` | `ReservationsPage.tsx` | `Builder/ReservationTest.php` |
| REQ-TEAM-005 | Policies + /me permissions | Policies em `app/Policies/`, `AuthController.php` | `hooks/use-builder-permissions.ts` | `AuthorizationTest.php` |
| REQ-TEAM-006 | UI /team | — | `TeamPage.tsx` | `TeamTest.php` |

---

## admin-tenants

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-ADM-001 | Listar tenants | `Admin/TenantController.php` | `apps/admin/AdminHome.tsx` | `tests/Feature/Admin/TenantTest.php` |
| REQ-ADM-002 | CRUD tenant | `Admin/TenantController.php` | `TenantEditPage.tsx` | `TenantTest.php` |
| REQ-ADM-003 | Apenas admin | `EnsureAdmin.php` | `ProfileGuard.tsx` | `TenantTest.php` |
| REQ-ADM-004 | Admin UI | — | `AdminHome.tsx` | `AdminHome.test.tsx` |
| REQ-ADM-005 | Editar name/slug/active | `TenantController.php` | `TenantEditPage.tsx` | `TenantEditPage.test.tsx` |
| REQ-ADM-006 | Impersonate | `TenantController.php`, `AuthController.php` | `TenantImpersonateDialog.tsx`, `ImpersonatePage.tsx` | `TenantImpersonationTest.php` |

---

## public-portal

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-PUB-001 | GET public buildings | `Public/BuildingController.php` | `PublicHome.tsx` | `tests/Feature/Public/BuildingTest.php` |
| REQ-PUB-002 | Sem auth | `routes/api.php` (grupo public) | — | `BuildingTest.php` |
| REQ-PUB-003 | Frontend www | — | `apps/public/` | `PublicHome.test.tsx` |
| REQ-PUB-004 | SEO meta | `BuildingController.php` | `PublicHome.tsx` | — |
| REQ-PUB-005 | Deploy diadimoveis.com.br | — | — | deferred |
| REQ-PUB-006 | cheapest_unit | `Public/BuildingController.php` | `BuildingCard.tsx` | `BuildingTest.php` |
| REQ-PUB-007 | cover_image | `Support/BuildingCoverImage.php` | `BuildingCard.tsx` | `BuildingTest.php` |
| REQ-PUB-008 | Layout hero/header/footer | — | `PublicLayout.tsx`, `PublicHero.tsx` | — |

---

## subdomain-portals

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-SUB-001–006 | Subdomínios + rotas raiz | `config/cors.php` | `lib/profile.ts`, `App.tsx`, `ProfileGuard.tsx` | `profile.test.ts`, `ProfileGuard.test.tsx` |
| REQ-SUB-007 | CORS | `config/cors.php` | — | `tests/Feature/Api/CorsTest.php` |
| REQ-SUB-008–009 | VITE_API_URL + env | `docker-compose.yml`, `.env.example` | `lib/api.ts` | — |
| REQ-SUB-010 | Testes Vitest host | — | `lib/profile.test.ts` | idem |
| REQ-SUB-011 | Paths legados | — | `LegacyPathNotice.tsx`, `PortalGuidePage.tsx` | `App.test.tsx` |
| REQ-SUB-012 | Deploy produção DNS | — | — | deferred |

---

## frontend-shell

| REQ | Descrição | BE | FE | Testes |
|-----|-----------|----|----|--------|
| REQ-FE-001 | shadcn preset | — | `frontend/components.json` | — |
| REQ-FE-002 | Layout shell | — | `components/layout/DashboardShell.tsx` | — |
| REQ-FE-003 | Rotas por perfil | — | `App.tsx` | `App.test.tsx` |
| REQ-FE-004 | shadcn via CLI | — | `components/ui/` | — |
| REQ-FE-005 | components.json versionado | — | `frontend/components.json` | — |

---

## Manutenção

Ao implementar feature nova:

1. Adicionar linhas neste arquivo (REQ → arquivos).
2. Referenciar REQ em `@see` no controller ou docblock do teste.
3. Atualizar `docs/api/openapi.yaml` se expôs endpoint novo.
