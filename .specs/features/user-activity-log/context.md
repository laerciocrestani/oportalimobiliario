# Context — user-activity-log

Premissas do discovery aceitas ao iniciar a feature (2026-08-19).

## Decisões de produto

| Tema | Decisão |
|------|---------|
| Login falho | Entra no log (identificador tentado + falha). Se o usuário existir, no log dele; senão, só admin vê (`actor_user_id` nulo). |
| Ex-membros | Quem tem `audit.view` ainda seleciona ex-membros do tenant para consulta. Eventos permanecem até o purge. |
| Filtro tenant no corretor | Opcional — a conta atua em N tenants. |
| Anexos | Só metadados (id, nome, tipo, ação). Sem binário. |
| Tela | Item de menu dedicado **Atividade** (`/activity`), não modal no perfil. |
| PII no próprio log | Completo para o ator, `audit.view` e admin. |
| Frases | Persistidas em PT-BR (auditoria e CSV sem o app). |
| Quem atribui `audit.view` | Quem já tem `team.manage` (checkboxes da equipe). |
| LGPD vs trilha | Na v1 a trilha de 5 anos vence; a API do produto não apaga evento a pedido do titular. |
| Jobs | Não geram log de usuário. |
| Duplicação timeline | Consciente: a mutação da reserva emite timeline **e** log da pessoa no mesmo ponto de escrita. |

## Cosmética

- Label do menu: **Atividade**.
- Permissão: `audit.view` / “Auditar atividade da equipe”.
