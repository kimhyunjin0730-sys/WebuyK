# Multi-stage Dockerfile for the NestJS API on Google Cloud Run.
# Includes Playwright + Chromium for the "정밀 URL" parser mode.
# Cloud Run injects PORT env var at runtime (default 8080) — main.ts
# already reads process.env.PORT so no code change needed.

FROM mcr.microsoft.com/playwright:v1.47.0-jammy AS base
WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# ---- deps stage ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---- build stage ----
FROM deps AS build
COPY . .
RUN pnpm --filter @wbk/shared build || true
RUN pnpm --filter @wbk/api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @wbk/api build

# ---- runtime stage ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/main.js"]
