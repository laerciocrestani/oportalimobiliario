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
TenantSeeder → RolePermissionSeeder → UserSeeder → BuildingSeeder → TowerSeeder
→ UnitSeeder → BuildingMediaSeeder → BrokerInviteSeeder → BrokerTenantSeeder
→ UnitAccessSeeder → BuildingAccessSeeder → ReservationSeeder
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
| `BuildingSeeder` | Empreendimentos por tenant (publicados e rascunho) |
| `TowerSeeder` | Torres vinculadas aos buildings |
| `UnitSeeder` | Unidades com status variados (`available`, `reserved`, `sold`) |
| `BuildingMediaSeeder` | Mídias de capa e galeria |
| `BrokerInviteSeeder` | Convites pendentes/aceitos |
| `BuildingAccessSeeder` | Acesso do corretor demo a empreendimentos |
| `UnitAccessSeeder` | Acesso legado por unidade |
| `BrokerTenantSeeder` | Vínculo corretor ↔ tenant após aceite |
| `ReservationSeeder` | Reservas ativas e expiradas para testes |

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
