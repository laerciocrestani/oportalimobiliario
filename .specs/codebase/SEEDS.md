# Seeds — dados de desenvolvimento

Checklist manual com smoke tests: [`docs/DEV_ACCESS.md`](../../docs/DEV_ACCESS.md).  
**Senha padrão de todos os usuários demo:** `password`

## Popular banco local

```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
```

**Não usar** `migrate:fresh` sem pedido explícito — apaga todos os dados locais.

Ordem de execução (`DatabaseSeeder`):

```
TenantSeeder → RolePermissionSeeder → UserSeeder → InccIndexSeeder → AmenitySeeder → BuildingSeeder
→ WizardBuildingSeeder → TowerSeeder → UnitSeeder → BuildingMediaSeeder → BrokerInviteSeeder → BrokerTenantSeeder
→ UnitAccessSeeder → BuildingAccessSeeder → ReservationSeeder → ContractTemplateSeeder
```

---

## Tenants

| Slug | Nome | Uso |
|------|------|-----|
| `construtora-alpha` | Construtora Alpha | Tenant principal de demo |
| `construtora-beta` | Construtora Beta | Segundo tenant (isolamento) |
| `system` | System | Tenant interno (roles admin/broker Spatie) |

---

## Usuários

| Email | Role | Tenant | Permissões builder | Portal |
|-------|------|--------|-------------------|--------|
| `admin@oportalimobiliario.com.br` | `admin` | — | — | `admin.localhost:5173` |
| `construtora@alpha.demo` | `builder` | alpha | **todas** (`BuilderPermissions::all()`) | `construtora.localhost:5173` |
| `comercial@alpha.demo` | `builder` | alpha | `buildings.view`, `invites.send` | construtora |
| `supervisor@alpha.demo` | `builder` | alpha | `buildings.view`, `units.update_status`, `reservations.cancel` | construtora |
| `construtora@beta.demo` | `builder` | beta | **todas** | construtora |
| `corretor@demo.com` | `broker` | — | — (acesso via `building_access` / `unit_access`) | `corretor.localhost:5173` |

### Cenários de permissão

- **comercial@alpha.demo** — vê empreendimentos e envia convites; não gerencia unidades nem cancela reservas.
- **supervisor@alpha.demo** — altera status de unidades e cancela reservas; não gerencia equipe nem empreendimentos.
- **construtora@beta.demo** — usar para testar **isolamento de tenant** (não deve ver dados da alpha).

---

## Dados de domínio (após seed completo)

| Seeder | O que cria |
|--------|------------|
| `InccIndexSeeder` | Índice INCC-M global (fev–jul/2026, valores demo, `source=manual`) |
| `AmenitySeeder` | Catálogo fechado de adicionais (água quente, piscina, academia, etc.) |
| `BuildingSeeder` | Empreendimentos por tenant (publicados e rascunho) — fluxo legado |
| `WizardBuildingSeeder` | **Residencial Bosque** (`residencial-bosque`) via `BuildingStructureService` + `BuildingUnitGridService`: endereço, defaults, adicionais do prédio, 1 torre / 3 andares, ficha, `price_base` + competência `2026-02-01`, publicado com `wizard_completed_at` |
| `TowerSeeder` | Torres vinculadas aos buildings (pula Bosque / wizard concluído) |
| `UnitSeeder` | Unidades com status variados; preenche `price_base` e `price_competence` para o cálculo INCC-M (pula Bosque) |
| `BuildingMediaSeeder` | Mídias de capa e galeria |
| `BrokerInviteSeeder` | Convites pendentes/aceitos |
| `BuildingAccessSeeder` | Acesso do corretor demo a empreendimentos |
| `UnitAccessSeeder` | Acesso legado por unidade |
| `BrokerTenantSeeder` | Vínculo corretor ↔ tenant após aceite |
| `ReservationSeeder` | Reservas ativas e expiradas para testes |
| `ContractTemplateSeeder` | Modelo **Compra e venda padrão** no tenant Alpha |

### Residencial Bosque (caminho do wizard)

Slug `residencial-bosque`, tenant Alpha, **publicado**. Não passa por `TowerSeeder`/`UnitSeeder`.

| Campo | Valor demo |
|-------|------------|
| Endereço | Av. Paulista, 1578 — Bela Vista, São Paulo/SP, CEP `01310100` |
| Defaults | forro gesso, esquadria alumínio, piso porcelanato, solar norte, sol manhã |
| Adicionais do prédio | piscina, academia, água quente |
| Estrutura | Torre A, 3 andares (`floors.kind`: 1–2 residencial, 3 comercial) |
| Unidades | 101, 102, 201, 202, 301 — `price_base` + competência `2026-02-01` |
| Extra 301 | adicional `closet` (união com os do prédio) |
| Corretor demo | acesso a 101, 201 e 301 |

Re-seed é idempotente: se `published` ou `wizard_completed_at` já existem, o seeder não regrava a estrutura (409 no serviço).

---

## Login via API (debug)

```bash
curl -s -X POST http://api.localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"construtora@alpha.demo","password":"password"}'
```

Token retornado → header `Authorization: Bearer <token>` nas rotas autenticadas.

---

## Testes automatizados

Testes usam **SQLite em memória** (`backend/.env.testing`), não o Postgres de dev.  
Factories criam dados isolados; não dependem destes seeds.

```bash
docker compose exec backend php artisan test --compact
```
