# Conventions

## Docker workflow

Todo comando de desenvolvimento usa `docker compose exec`:

```bash
docker compose exec backend php artisan test
docker compose exec frontend pnpm test
```

**Proibido no host:** `php artisan`, `composer`, `pnpm`, `npm`, `vite`.

**Exceções no host:** `docker compose up/down/build`, `git`.

## Backend

- PSR-12, Laravel conventions
- API JSON only em `/api/*`
- Pest para testes; referenciar REQ-* em docblocks
- Factories + Seeders por domínio

## Frontend

- TypeScript strict
- Componentes shadcn via CLI oficial
- Rotas por perfil em `src/apps/`

## Git

- Conventional Commits
- Commit atômico + push por etapa/feature
- Branch `main`, remote GitHub
