# Structure

```
backend/
├── app/
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
│   ├── apps/              # Por perfil (construtora, corretor, admin, publico)
│   ├── components/
│   │   └── ui/            # shadcn
│   └── lib/
│       └── api.ts
└── vitest.config.ts

.specs/
├── project/
├── features/
└── codebase/
```
