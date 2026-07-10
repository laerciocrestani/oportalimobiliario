# Permissions — matriz de autorização

## Roles globais (Spatie)

| Role | Escopo | Middleware |
|------|--------|------------|
| `admin` | Cross-tenant SaaS | `admin` |
| `builder` | Um `tenant_id` | `builder` + `tenant.from.user` + `tenant.ensure` |
| `broker` | Cross-tenant via acesso explícito | `broker` + `tenant.ensure.none` |

Roles seedadas em `RolePermissionSeeder`. Teams Spatie usam `tenant_id` (`SetPermissionsTeamId`).

---

## Permissions builder (granulares)

Definidas em `backend/app/Support/BuilderPermissions.php`.  
Labels PT em `BuilderPermissions::labels()`.

| Permission | Label (UI) | Libera |
|------------|------------|--------|
| `buildings.view` | Ver empreendimentos | Listar/ver buildings, torres, unidades |
| `buildings.manage` | Gerenciar empreendimentos e torres | CRUD buildings, torres, mídia |
| `units.manage` | Gerenciar unidades | CRUD unidades |
| `units.update_status` | Alterar status de unidades | PATCH status (`available`/`reserved`/`sold`) |
| `invites.send` | Convidar corretores | CRUD convites, reenvio |
| `access.manage` | Gerenciar acesso de corretores | `building_access` por corretor |
| `reservations.cancel` | Cancelar reservas | Listar/cancelar reservas, thread de mensagens (builder) |
| `team.manage` | Gerenciar equipe | CRUD `/api/builder/team` |

### Policies que usam permissions

| Policy | Permission principal |
|--------|---------------------|
| `BuildingPolicy` | `buildings.view` / `buildings.manage` |
| `TowerPolicy` | `buildings.manage` |
| `UnitPolicy` | `units.manage` / `units.update_status` |
| `BuildingMediaPolicy` | `buildings.manage` |
| `BrokerInvitePolicy` | `invites.send` |
| `BuildingAccessPolicy` | `access.manage` |
| `ReservationPolicy` | `reservations.cancel` (builder); ownership (broker) |
| `TeamMemberPolicy` | `team.manage` |

Todas as policies builder usam `AuthorizesBuilderTenant` para validar mesmo `tenant_id`.

---

## Broker — sem permissions Spatie

Acesso a recursos via:

1. **`building_access`** — empreendimento liberado pela construtora.
2. **`unit_access`** — legado, unidade individual.
3. **Ownership** — reservas e mensagens onde `reservation.broker_id === user.id`.

Serviço central: `BrokerUnitAccessService.php`.

---

## Admin — sem permissions granulares

Acesso total a tenants via role `admin` + `EnsureAdmin` middleware.  
Impersonate: `POST /api/admin/tenants/{tenant}/impersonate`.

---

## Frontend

- `GET /api/auth/me` retorna `permissions: string[]` para builders.
- Hook: `apps/builder/hooks/use-builder-permissions.ts`
- Constantes espelhadas: `apps/builder/lib/builder-permissions.ts`
- Nav item **Reservas** (builder): visível apenas com `reservations.cancel`
- Nav item **Equipe**: visível apenas com `team.manage`

---

## Usuários demo (ver SEEDS.md)

| Usuário | Permissions |
|---------|-------------|
| `construtora@alpha.demo` | todas (8) |
| `comercial@alpha.demo` | `buildings.view`, `invites.send` |
| `supervisor@alpha.demo` | `buildings.view`, `units.update_status`, `reservations.cancel` |

Use estes perfis para testar 403 sem adivinhar permissões.
