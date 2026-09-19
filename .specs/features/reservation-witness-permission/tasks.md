# Tasks — reservation-witness-permission

## T1 — Catálogo

**What:** Constante `reservations.witness` + label PT no BE e no FE.  
**Where:** `BuilderPermissions.php`, `builder-permissions.ts`, `TeamTest.php`  
**Done when:** `BuilderPermissions::all()` contém a chave; Equipe lista o checkbox.  
**Tests:** `TeamTest.php`  
**Gate:** `docker compose exec backend php artisan test --compact --filter=TeamTest`

## T2 — Elegibilidade e atribuição

**What:** Filtrar candidatos; `assertTeamMember` exige a permission; `createWitnesses()` concede a permission; assinatura pelo slot inalterada.  
**Where:** `ReservationContractCompletionService.php`, `tests/Pest.php`, `ReservationWitnessTest.php`  
**Done when:** candidatos sem permission somem; assign 422; slot assina após revoke.  
**Tests:** `ReservationWitnessTest.php`  
**Gate:** `docker compose exec backend php artisan test --compact --filter=ReservationWitness`

## T3 — Seeds e docs

**What:** Supervisor demo com a permission; PERMISSIONS/SEEDS/FLOWS/TRACEABILITY/OpenAPI/STATE.  
**Where:** `UserSeeder.php`, índices `.specs/codebase/`, `docs/api/openapi.yaml`  
**Done when:** docs batem com o catálogo; OpenAPI descreve candidatos elegíveis.  
**Gate:** docs + testes T1–T2 verdes
