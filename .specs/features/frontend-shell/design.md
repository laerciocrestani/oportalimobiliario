# Design: frontend-shell

## Bootstrap

```bash
docker compose exec frontend pnpm dlx shadcn@latest init --preset b3kI323Ky --template vite
```

## Estrutura

```
frontend/src/
├── apps/
│   ├── builder/       # portal construtora.localhost
│   ├── broker/        # portal corretor.localhost
│   ├── admin/
│   ├── public/        # portal www.localhost
│   └── auth/          # LoginPage, guards
├── components/
│   ├── ui/          # shadcn
│   └── layout/      # AppShell, Sidebar, Header
├── lib/
│   ├── api.ts       # builderApi, brokerApi, adminApi, publicApi
│   ├── profile.ts   # hostname PT → profile key EN
│   └── utils.ts
└── main.tsx         # React Router
```

## Layout

- `AppShell`: sidebar fixa + área de conteúdo
- Identidade visual única entre perfis (tokens do preset)

## Rotas (pós subdomain-portals)

| Host (dev) | App |
|------------|-----|
| `construtora.localhost:5173` | Builder dashboard |
| `corretor.localhost:5173` | Broker dashboard |
| `admin.localhost:5173` | Admin dashboard |
| `www.localhost:5173` | Portal público |

Paths legados `/construtora`, `/corretor`, etc. exibem orientação para o subdomínio correto.
