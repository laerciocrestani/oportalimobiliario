# Structure

```
backend/
├── app/
│   ├── Http/Controllers/Api/
│   │   ├── Builder/       # /api/builder/*
│   │   ├── Broker/        # /api/broker/*
│   │   ├── Admin/
│   │   └── Public/
│   ├── Models/
│   │   ├── Building.php
│   │   ├── Unit.php
│   │   ├── Reservation.php
│   │   ├── BrokerInvite.php
│   │   └── UnitAccess.php
│   └── Tenancy/           # TenantContext, middlewares, traits
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── routes/
│   └── api.php
└── tests/
    ├── Feature/
    └── Unit/

frontend/
├── src/
│   ├── apps/              # Por portal (builder, broker, admin, public)
│   ├── components/
│   │   └── ui/            # shadcn
│   └── lib/
│       ├── api.ts         # builderApi, brokerApi, adminApi, publicApi
│       └── profile.ts     # hostname PT → profile key EN
└── vitest.config.ts

.specs/
├── project/
├── features/
└── codebase/
    ├── AI_CONTEXT.md     # índice de documentação para IA
    ├── ARCHITECTURE.md
    ├── TRACEABILITY.md   # REQ → arquivos
    ├── SEEDS.md          # usuários demo
    ├── FLOWS.md          # fluxos end-to-end
    ├── FRONTEND.md       # rotas e portais
    ├── PERMISSIONS.md    # matriz de autorização
    └── ANTI-PATTERNS.md  # erros comuns para IA
```

Raiz: [`AGENTS.md`](../../AGENTS.md) · Checklist: [`docs/DEV_ACCESS.md`](../../docs/DEV_ACCESS.md)
