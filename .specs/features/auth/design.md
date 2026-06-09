# Design: auth

## Backend

- `App\Http\Controllers\Api\AuthController`
- Rotas em `routes/api.php` prefix `auth`
- User: `HasApiTokens`, `HasRoles` (Spatie)
- `config/permission.php`: `teams` => true, `team_foreign_key` => `tenant_id`

## Frontend

- `frontend/src/apps/auth/LoginPage.tsx`
- `frontend/src/lib/api.ts` — cliente fetch com token
- Rota `/login` fora do AppShell

## Seeders

- `RolePermissionSeeder` — roles e permissions base
- `UserSeeder` — admin, construtoras, corretores demo
