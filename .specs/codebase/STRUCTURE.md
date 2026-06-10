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
```
