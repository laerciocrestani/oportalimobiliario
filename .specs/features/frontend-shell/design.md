# Design: frontend-shell

## Bootstrap

```bash
docker compose exec frontend pnpm dlx shadcn@latest init --preset b3kI323Ky --template vite
```

## Estrutura

```
frontend/src/
├── apps/
│   ├── construtora/
│   ├── corretor/
│   ├── admin/
│   └── publico/
├── components/
│   ├── ui/          # shadcn
│   └── layout/      # AppShell, Sidebar, Header
├── lib/
│   └── utils.ts
└── main.tsx         # React Router
```

## Layout

- `AppShell`: sidebar fixa + área de conteúdo
- Identidade visual única entre perfis (tokens do preset)

## Rotas

| Path | App |
|------|-----|
| `/construtora/*` | Construtora dashboard |
| `/corretor/*` | Corretor dashboard |
| `/admin/*` | Admin dashboard |
| `/publico/*` | Portal público |
