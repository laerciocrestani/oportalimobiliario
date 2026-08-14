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

> **v2 (pré-reserva):** fluxo em 2 fases com hold de 10 min antes de confirmar. Ver seção 2.1.

```mermaid
sequenceDiagram
    participant B as Corretor
    participant API as ReservationController
    participant U as Unit
    participant CMD as expire-reservations

    B->>API: POST /api/broker/reservations/pre-hold
    API->>U: status → pre_reserved
    B->>API: PATCH /api/broker/reservations/{id}/confirm
    API->>U: status → reserved
    API-->>B: reservation + expires_at (TTL 48h)
    Note over B: observations opcional → 1ª mensagem da thread
    CMD->>API: opim:expire-reservations (hourly)
    CMD->>U: status → available (se expirou)
```

### 2.1 Pré-reserva e concorrência (v2)

```mermaid
sequenceDiagram
    participant A as CorretorA
    participant B as CorretorB
    participant API as API
    participant CMD as expire-pre-reservations

    A->>API: POST /broker/reservations/pre-hold
    API-->>A: 201 pre_hold (TTL 10min)
    B->>API: POST /broker/reservations/pre-hold
    API-->>B: 422 unidade já pré-reservada
    loop polling 5s (BrokerUnitsDialog aberto)
        B->>API: GET /broker/units
        API-->>B: unit pre_reserved + held_by_me false
    end
    A->>API: PATCH /broker/reservations/{id}/confirm
    A->>API: DELETE /broker/reservations/{id}/pre-hold (cancelar dialog)
    CMD->>API: opim:expire-pre-reservations (every minute)
```

**Arquivos chave:**

- Pré-reserva: `PreReservationService.php`, `Broker/ReservationController.php`
- Expiração confirmadas: `ReservationExpirationService.php`, `ExpireReservations.php`
- Expiração pré-holds: `PreReservationService.php`, `ExpirePreReservations.php`
- TTL: `config/opim.php` → `pre_reservation_ttl_minutes` (10), `reservation_ttl_hours` (48)
- FE polling: `frontend/src/lib/reservation-polling.ts`, `BrokerUnitsDialog.tsx`

### 2.2 Cancelamento manual

| Ator | Endpoint | Efeito |
|------|----------|--------|
| Corretor (dono) | `DELETE /api/broker/reservations/{id}` | unit → available, delete reservation |
| Corretor (pre-hold) | `DELETE /api/broker/reservations/{id}/pre-hold` | unit → available, delete draft |
| Construtora | `DELETE /api/builder/reservations/{id}` | unit → available, delete reservation |

Hard delete — sem histórico/auditoria. Mensagens cascade delete.

### 2.3 Matriz de erros (reservas)

| Cenário | HTTP | Mensagem |
|---------|------|----------|
| Sem acesso à unidade | 403 | No access to this unit. |
| Cliente de outro corretor | 403 | Client not found. |
| Unidade indisponível (confirm direto) | 422 | Unit not available for reservation. |
| Pre-hold em unidade held | 422 | Esta unidade acaba de ser pré-reservada por outro corretor. |
| Confirmar hold expirado | 422 | Sua pré-reserva expirou. A unidade está disponível novamente. |
| Broker sem tenant ativo | 403 | Seu acesso ao portal está restrito... |
| Builder sem permission | 403 | Policy deny |
| Polling FE: available → pre_reserved (outro) | — | Toast 1x por unidade/sessão |

**Arquivos chave (legado v1 — POST direto ainda suportado):**

- Criação direta: `Broker/ReservationController.php::store`
- Expiração: `ReservationExpirationService.php`, `ExpireReservations.php`

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

## 4. Timeline de reserva (pré-reserva → venda)

> Spec: [reservation-timeline/spec.md](../features/reservation-timeline/spec.md) · Design: [reservation-timeline/design.md](../features/reservation-timeline/design.md) · Fonte: [reuniao](../../reuniao) L37–L65

Fluxo completo. Etapas 1–2 já implementadas; 3–12 especificadas.

```mermaid
flowchart TD
    subgraph fase1 [Fase1_PreReserva]
        S1[pre_hold_created]
        S2[dialogue]
    end
    subgraph fase2 [Fase2_Proposta]
        S3[proposal_submitted]
        S4{proposal_decision}
        S4a[proposal_accepted]
        S4b[proposal_rejected]
        S4c[proposal_returned]
    end
    subgraph fase3 [Fase3_Sinal]
        S5[deposit_window_48h]
        S6[deposit_proof_submitted]
        S7[deposit_proof_approved]
        S7alert[deposit_overdue_alert]
    end
    subgraph fase4 [Fase4_Contrato]
        S8[contract_data_submitted]
        S9[contract_issued]
        S10[contract_signed_gov]
        S11[contract_uploaded]
        S12[contract_validated]
        S13[sold]
    end

    S1 --> S2 --> S3 --> S4
    S4 -->|aceita| S4a --> S5
    S4 -->|recusada| S4b
    S4 -->|devolvida| S4c --> S2
    S5 --> S6 --> S7
    S5 -->|sem sinal| S7alert
    S7 --> S8 --> S9 --> S10 --> S11 --> S12 --> S13
```

### 4.1 Sequência por ator

```mermaid
sequenceDiagram
    participant Brk as Corretor
    participant Bld as Gestor
    participant API as API
    participant CMD as check-deposit-windows

    Brk->>API: POST pre-hold
    Brk->>API: POST messages (diálogo)
    Brk->>API: POST proposal
    Bld->>API: PATCH proposal/decision (accepted)
    Note over API: unit reserved, TTL 48h sinal
    Brk->>API: POST deposit-proof (comprovante)
    Bld->>API: PATCH deposit-proof/approve
    Brk->>API: POST contract-data (docs)
    Bld->>API: POST contract/issue (PDF)
    Brk->>API: POST contract/signed (GOV)
    Bld->>API: PATCH contract/validate
    Note over API: unit sold
    CMD->>API: deposit_overdue alert (se 48h sem comprovante)
```

### 4.2 Leitura do timeline

| Endpoint | Ator |
|----------|------|
| `GET /api/broker/reservations/{id}/timeline` | Corretor dono |
| `GET /api/builder/reservations/{id}/timeline` | Gestor (`reservations.cancel`) |

Resposta: `current_stage`, `expires_at`, `steps[]` com status `completed` | `current` | `upcoming` | `skipped` | `failed`.

### 4.3 Regras de negócio

| Regra | Detalhe |
|-------|---------|
| Início | Sempre corretor via pré-reserva |
| Unidade reservada | De proposta aceita até venda (`unit.status = reserved`) |
| TTL 48h | Inicia após aceite da proposta (janela do sinal), não no envio da proposta |
| Proposta devolvida | Corretor corrige e reenvia; diálogo continua |
| Proposta recusada | Encerra fluxo; unidade volta `available` |
| Comprovante vencido | Alerta corretor + gestor; unidade permanece reservada (v1) |

### 4.4 Alinhamento com v2 atual

| Implementado hoje | Próximo passo (Fase B+) |
|-------------------|-------------------------|
| `pre_hold` + mensagens | Timeline steps 1–2 via GET |
| `PATCH confirm` → `confirmed` | Virar envio de proposta |
| Hard delete cancelamento | Soft `cancelled` após `reserved` |

**Arquivos previstos:** ver [reservation-timeline/design.md § Arquivos previstos](../features/reservation-timeline/design.md#arquivos-previstos-implementação).

---

## 5. Convite corretor → acesso cross-tenant

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

## 6. Permissões granulares (equipe builder)

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

## 7. Impersonação admin → builder

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

## 8. Portal público (read-only)

```
www.localhost → PublicHome → publicApi.getBuildings()
  → GET /api/public/buildings (published=true only)
  → cards com cheapest_unit + cover_image
```

Sem autenticação. Filtro `published` no controller, não no FE.
