# Testing

## Backend (Pest)

```bash
docker compose exec backend php artisan test
```

### Estrutura

```
backend/tests/
├── Feature/
│   ├── Api/
│   ├── Tenancy/
│   ├── Auth/
│   └── ...
├── Unit/
│   └── Tenancy/
└── Pest.php
```

### Cobertura obrigatória por endpoint

- Happy path
- 401/403 auth
- 422 validação
- Tenant isolation (quando aplicável)

### Gate

Nenhuma task `feat` concluída sem `php artisan test` passando.

## Frontend (Vitest + RTL)

```bash
docker compose exec frontend pnpm test
```

### Cobertura mínima

- Componentes com interação
- Fluxos críticos (login, formulários)

## Seeds

```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
```

**Não usar** `migrate:fresh` no dia a dia — apaga todos os dados locais. Reservar apenas reset completo quando o usuário pedir explicitamente.

Testes rodam em SQLite (`backend/.env.testing`), isolados do Postgres de desenvolvimento.

## Requisitos globais

- `REQ-API-TEST-001`: Feature test por endpoint
- `REQ-API-TEST-002`: Unit test por regra de negócio
- `REQ-API-SEED-001`: Seeder por feature de domínio
