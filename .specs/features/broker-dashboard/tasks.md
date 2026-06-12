# Tasks: broker-dashboard

## Backend

- [x] Migration `broker_clients` + `client_id` em reservations
- [x] Model `BrokerClient` + factory
- [x] `ClientController` (index, store)
- [x] `BrokerUnitAccessService` + ReservationController
- [x] Testes Pest ClientTest + ReservationTest
- [x] OpenAPI

## Frontend

- [x] Dialog shadcn
- [x] Nav + rotas + BrokerDashboardShell
- [x] BrokerOverviewPage (mock charts)
- [x] BrokerClientsPage
- [x] BrokerBuildingsPage + dialogs
- [x] api.ts + testes Vitest

## Gate

- [x] `docker compose exec backend php artisan test`
- [x] `docker compose exec frontend pnpm test src/apps/broker`
