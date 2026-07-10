# Flows — fluxos de negócio end-to-end

Diagramas dos caminhos críticos. Para arquivos exatos, ver [TRACEABILITY.md](./TRACEABILITY.md).

---

## 1. Autenticação e tenancy (builder)

```mermaid
sequenceDiagram
    participant FE as LoginPage
    participant API as AuthController
    participant MW as SetTenantFromUser
    participant CTX as TenantContext

    FE->>API: POST /api/auth/login
    API-->>FE: token + user (role, tenant_id)
    FE->>FE: localStorage opim_token (origin-scoped)
    FE->>API: GET /api/builder/buildings (Bearer)
    API->>MW: middleware tenant.from.user
    MW->>CTX: set(user.tenant_id)
    API-->>FE: buildings do tenant apenas
```

**Regras:**

- Builder: `user.tenant_id` → `TenantContext` → global scope `BelongsToTenant`.
- Broker/Admin: **sem** `TenantContext` global (`EnsureNoTenantContext`).
- `SetTenantFromUser` deve rodar **antes** de `SubstituteBindings` (ver `bootstrap/app.php`).

---

## 2. Reserva soft (broker → expiração)

```mermaid
sequenceDiagram
    participant B as Corretor
    participant API as ReservationController
    participant U as Unit
    participant CMD as expire-reservations

    B->>API: POST /api/broker/reservations (unit_id, client_id)
    API->>API: valida BuildingAccess ou UnitAccess
    API->>U: status → reserved
    API-->>B: reservation + expires_at (TTL config/opim.php)
    Note over B: observations opcional → 1ª mensagem da thread
    CMD->>API: opim:expire-reservations (schedule)
    CMD->>U: status → available (se expirou)
```

**Arquivos chave:**

- Criação: `Broker/ReservationController.php`
- Expiração: `ReservationExpirationService.php`, `ExpireReservations.php`
- TTL: `config/opim.php` → `reservation_ttl_hours` (default 48h)

---

## 3. Thread de mensagens (reserva)

```mermaid
sequenceDiagram
    participant Brk as Corretor
    participant Bld as Construtora
    participant API as MessageControllers

    Brk->>API: POST /broker/reservations (observations)
    Note over API: cria ReservationMessage inicial
    Bld->>API: GET /builder/reservations
    Bld->>API: POST /builder/reservations/{id}/messages
    Brk->>API: GET /broker/reservations/{id}/messages
    Brk->>API: POST /broker/reservations/{id}/messages
    Note over Bld,Brk: badge pending-replies-count na nav
```

**Policy:** `ReservationPolicy::viewMessages` — broker só vê próprias reservas; builder precisa `reservations.cancel` + mesmo tenant.

---

## 4. Convite corretor → acesso cross-tenant

```mermaid
sequenceDiagram
    participant Bld as Construtora
    participant API as BrokerInviteController
    participant Mail as BrokerInviteMail
    participant Brk as Corretor (novo ou existente)

    Bld->>API: POST /api/builder/invites (email, building_ids)
    API->>Mail: invite_url com token
    Brk->>API: GET /api/broker/invites/preview?token=
    Brk->>API: POST /api/broker/invites/accept
    API->>API: cria/atualiza User broker
    API->>API: broker_tenants + building_access
    API-->>Brk: token Sanctum (login automático)
```

**Acesso posterior:**

- Preferencial: `building_access` (empreendimento inteiro).
- Legado: `unit_access` (unidade individual).
- Broker lista unidades via `BrokerUnitAccessService` (união dos dois).

---

## 5. Permissões granulares (equipe builder)

```mermaid
flowchart LR
    A[User builder] --> B{tenant_id}
    B --> C[SetPermissionsTeamId]
    C --> D[Spatie permissions]
    D --> E[Policy authorize]
    E --> F[Controller action]
```

- Catálogo: `BuilderPermissions.php` (8 permissions).
- Atribuição: `TeamMemberController` ou `UserSeeder` (perfis demo).
- FE: `GET /api/auth/me` retorna `permissions[]` → `use-builder-permissions.ts`.

---

## 6. Impersonação admin → builder

```mermaid
sequenceDiagram
    participant Adm as Admin
    participant API as TenantController
    participant Brk as construtora.localhost

    Adm->>API: POST /api/admin/tenants/{id}/impersonate (user_id)
    API-->>Adm: one-time code
    Adm->>Brk: /auth/impersonate?code=
    Brk->>API: POST /api/auth/impersonate/exchange
    API-->>Brk: token builder do usuário escolhido
```

**Arquivos:** `Admin/TenantController.php`, `ImpersonatePage.tsx`, `TenantImpersonateDialog.tsx`.

---

## 7. Portal público (read-only)

```
www.localhost → PublicHome → publicApi.getBuildings()
  → GET /api/public/buildings (published=true only)
  → cards com cheapest_unit + cover_image
```

Sem autenticação. Filtro `published` no controller, não no FE.
