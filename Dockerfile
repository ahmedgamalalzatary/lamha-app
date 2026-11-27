# syntax=docker/dockerfile:1
# The API and dashboard images, built from the repo root by deploy/server-deploy.sh:
#   docker build --target api -t tawsela-api .
#   docker build --target web --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/v1 -t tawsela-web .
# Both share one install and one shared-package build; the second build reuses them from the cache.
# Packages are kept in a build cache (tawsela-pnpm), so a rebuild downloads only what changed.
# Layers are ordered so a code change rebuilds and re-exports only the small code layers: the
# packages (hundreds of MB) change only with pnpm-lock.yaml. This server's disk is slow at many
# small writes, so that order is what keeps a code-change deploy short.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

# The manifests first, so a code change does not reinstall the packages. Every workspace's manifest
# comes in, so the lockfile matches; only the API's and the dashboard's packages are installed.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig packages/tsconfig
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY apps/demo/package.json apps/demo/
RUN --mount=type=cache,id=tawsela-pnpm,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir /pnpm-store --filter "@tawsela/api..." --filter "@tawsela/web..."

FROM deps AS shared
COPY packages/shared packages/shared
RUN pnpm --filter @tawsela/shared build

# The API's production packages, from the manifests only: this layer (the big one) is rebuilt and
# re-exported only when pnpm-lock.yaml changes, not on every code change.
FROM base AS api-prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY apps/demo/package.json apps/demo/
RUN --mount=type=cache,id=tawsela-pnpm,target=/pnpm-store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm-store --filter "@tawsela/api..."

# The API's code: compiled here, copied as a small layer of its own.
FROM shared AS api-build
COPY apps/api apps/api
RUN pnpm --filter @tawsela/api build

# The dashboard: a small Next.js server (output "standalone"), not a static export, because
# /stores/[id] takes any store and the pages use Next's cache components.
FROM shared AS web-build
COPY apps/web apps/web
# The browser code gets the API's address at build time (Next inlines NEXT_PUBLIC_*).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_API_URL" || { echo "NEXT_PUBLIC_API_URL is required" >&2; exit 1; }
RUN --mount=type=cache,id=tawsela-next,target=/repo/apps/web/.next/cache \
    pnpm --filter @tawsela/web build \
  && mv apps/web/.next/standalone/node_modules /standalone-modules

# The workspace layout as pnpm made it (apps/api/node_modules links into node_modules/.pnpm and to
# packages/shared). Packages first, then the shared package, then the API's own files.
FROM node:22-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-prod-deps /repo/node_modules ./node_modules
COPY --from=api-prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=shared /repo/packages/shared/package.json ./packages/shared/
COPY --from=shared /repo/packages/shared/dist ./packages/shared/dist
COPY --from=api-build /repo/apps/api/package.json ./apps/api/
COPY --from=api-build /repo/apps/api/drizzle ./apps/api/drizzle
COPY --from=api-build /repo/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
USER node
CMD ["node", "dist/main.js"]

FROM node:22-slim AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
# The traced packages first: the same files on most builds, so the layer is reused.
COPY --from=web-build /standalone-modules ./node_modules
COPY --from=web-build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
CMD ["node", "apps/web/server.js"]
