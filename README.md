# Tawsela (توصيلة)

A delivery app for Egypt (restaurants, desserts, markets, pharmacies, send anything), built to match Tawsilty. One mobile app serves customers, stores and drivers; admins use the web dashboard.

- What it is and how it is built: [`docs/project-contract.md`](docs/project-contract.md)
- Build order: [`docs/phases.md`](docs/phases.md)

## Apps

| Path | What | Dev port |
|---|---|---|
| `apps/web` | Admin dashboard (Next.js) | 3000 |
| `apps/demo` | Clickable web demo | 3001 |
| `apps/mobile` | Mobile app (Expo) | 3002 |
| `apps/api` | Backend (NestJS + MySQL) | 4000 |
| `packages/shared` | Shared types and formatters | |

## Run

```sh
pnpm install
cp .env.example .env   # then fill it in
pnpm dev               # everything
pnpm --filter @tawsela/api dev
```

Checks: `pnpm build lint typecheck test`.
