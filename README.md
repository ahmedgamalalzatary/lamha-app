# Tawsela (توصيلة)

A delivery app for Egypt (restaurants, desserts, markets, pharmacies, send anything), built to match Tawsilty. One mobile app serves customers, stores and drivers; admins use the web dashboard.

- What it is and how it is built: [`docs/project-contract.md`](docs/project-contract.md)
- Build order: [`docs/phases.md`](docs/phases.md)

## Apps

| Path | What | Dev port |
|---|---|---|
| `apps/web` | Web dashboard: admin area and partner area `/partner` (Next.js) | 3000 |
| `apps/demo` | Clickable web demo | 3001 |
| `apps/mobile` | Mobile app (Expo) | 3002 |
| `apps/api` | Backend (NestJS + MySQL) | 4000 |
| `packages/shared` | Shared types and formatters | |

## First run (Windows or macOS)

Needs Node 22 or newer (the builds use 24), pnpm and MySQL 8.

1. `pnpm install`
2. Copy `.env.example` to `.env` at the repo root (PowerShell: `Copy-Item .env.example .env`) and fill it in: at least `DATABASE_URL`, `JWT_ACCESS_SECRET` and `SEED_PASSWORD`. Every app reads this one file.
3. Create the database named in `DATABASE_URL` (for example `CREATE DATABASE tawsela;` in MySQL).
4. Build the shared package, then set up the database from `apps/api`:
   ```sh
   pnpm --filter @tawsela/shared build
   cd apps/api
   pnpm db:migrate   # every migration in apps/api/drizzle, in order
   pnpm db:seed      # try-out accounts (password: SEED_PASSWORD) and the catalog
   cd ../..
   ```
5. `pnpm dev` starts everything; `pnpm --filter @tawsela/api dev` starts the API alone. It answers at http://localhost:4000/v1/health, and the API docs are at http://localhost:4000/docs.

To try the app on a phone, the phone and the PC must share a Wi-Fi network, and `EXPO_PUBLIC_API_URL` must use the PC's address (for example `http://192.168.1.14:4000/v1`; `ipconfig` shows it), not `localhost`.

Database changes always go through a migration (`npx drizzle-kit generate --name …` in `apps/api`, then `pnpm db:migrate`); there is no schema push.

## Checks

`pnpm turbo run build lint typecheck test test:e2e --filter=!@tawsela/demo`

The e2e tests need `.env.test` at the repo root (same keys, `NODE_ENV=test`). They run against their own databases, `tawsela_test`, `tawsela_web_test` and `tawsela_mobile_test`, and rebuild them; they never touch the dev data. The names follow `.env.test`'s `DATABASE_URL` (any name ending in `_test`; the dashboard and app tests add `_web` and `_mobile`), and the test APIs' ports follow `NEXT_PUBLIC_API_URL` (4001) and `MOBILE_TEST_API_URL` (default 4002), so a second checkout can test at the same time on its own names and ports (see `.env.example`).
