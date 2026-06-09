# Feature: frontend-shell

## Requisitos

- `REQ-FE-001`: Frontend inicializado com preset `b3kI323Ky` e template Vite
- `REQ-FE-002`: Layout shell compartilhado entre perfis (construtora, corretor, admin)
- `REQ-FE-003`: Rotas base por perfil configuradas (React Router)
- `REQ-FE-004`: Componentes shadcn adicionados somente via CLI oficial
- `REQ-FE-005`: `components.json` versionado em `frontend/`

## Critérios de aceite

- [ ] shadcn init com preset b3kI323Ky
- [ ] AppShell com sidebar + header
- [ ] Rotas `/construtora`, `/corretor`, `/admin`, `/publico`
- [ ] Vitest passando
