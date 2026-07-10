# Concerns

## Ativos

- Nenhum blocker crítico após bootstrap infra

## A monitorar

- Laravel 13 exige PHP 8.4+ no container backend
- shadcn init no Docker pode exigir flags não-interativas
- Isolamento tenant: testes obrigatórios antes de features de domínio

## Débito técnico

- Example tests do Laravel scaffold (remover quando suite crescer)
- Manter `docs/api/openapi.yaml` sincronizado com rotas (gate manual; sem geração automática ainda)
