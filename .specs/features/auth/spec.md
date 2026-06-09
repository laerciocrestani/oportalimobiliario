# Feature: auth

## Requisitos

- `REQ-AUTH-001`: Login e-mail + senha via Laravel Sanctum (token API)
- `REQ-AUTH-002`: Roles admin, construtora, corretor via spatie/laravel-permission
- `REQ-AUTH-003`: Teams Spatie usam `tenant_id` como team scope
- `REQ-AUTH-004`: Endpoint `POST /api/auth/login` retorna token + user
- `REQ-AUTH-005`: Endpoint `GET /api/auth/me` retorna usuário autenticado
- `REQ-AUTH-006`: Tela de login no frontend com fluxo feliz testado

## Critérios de aceite

- [ ] Login válido retorna 200 + token
- [ ] Credenciais inválidas retornam 422
- [ ] /me requer autenticação (401)
- [ ] UserSeeder + RolePermissionSeeder registrados
