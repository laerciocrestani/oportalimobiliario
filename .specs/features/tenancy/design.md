# Design: tenancy

## Componentes

```
backend/app/Tenancy/
├── TenantContext.php
├── Concerns/
│   ├── BelongsToTenant.php
│   └── TenantAwareJob.php
└── Middleware/
    ├── SetTenantFromUser.php
    ├── EnsureTenantContext.php
    ├── EnsureNoTenantContext.php
    ├── EnsureBuilder.php
    └── EnsureBroker.php
```

## Fluxo builder (construtora)

```
Request → auth → SetTenantFromUser → TenantContext.set → BelongsToTenant scope
```

## Fluxo broker (corretor)

```
Request → auth → EnsureNoTenantContext → policy + unit_access
```

## Modelagem

- `tenants`: id, name, slug, active
- `users.tenant_id`: nullable FK (null para admin/broker)
- Models de domínio usam trait `BelongsToTenant`

## Middleware aliases

Registrados em `bootstrap/app.php`:

- `tenant.from.user`
- `tenant.ensure`
- `tenant.ensure.none`
- `builder`
- `broker`
