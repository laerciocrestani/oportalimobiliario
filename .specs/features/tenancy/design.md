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
    └── EnsureCorretor.php
```

## Fluxo construtora

```
Request → auth → SetTenantFromUser → TenantContext.set → BelongsToTenant scope
```

## Fluxo corretor

```
Request → auth → EnsureNoTenantContext → policy + acessos_unidades
```

## Modelagem

- `tenants`: id, name, slug, active
- `users.tenant_id`: nullable FK (null para admin/corretor)
- Models de domínio usam trait `BelongsToTenant`

## Middleware aliases

Registrados em `bootstrap/app.php`:

- `tenant.from.user`
- `tenant.ensure`
- `tenant.ensure.none`
- `corretor`
