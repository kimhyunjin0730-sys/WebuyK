# Builds the NestJS API with Playwright + Chromium for Google Cloud Run.
# pnpm monorepo + Docker has symlink issues, so we use --shamefully-hoist
# to flatten all deps into root node_modules (npm-style).

FROM mcr.microsoft.com/playwright:v1.47.0-jammy AS base
WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm install -g pnpm@9.7.0

# ---- install + build in one stage (no symlink-breaking COPY) ----
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --shamefully-hoist

COPY . .
RUN pnpm --filter @wbk/shared build || true
RUN pnpm --filter @wbk/api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @wbk/api build

# ---- runtime: just copy the flat tree, no symlinks to break ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/package.json ./package.json

WORKDIR /app/apps/api
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/main.js"]
