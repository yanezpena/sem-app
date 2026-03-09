# -----------------------------------------------------------------------------
# Stage 1: Builder – install deps, build shared + API, generate Prisma client
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

COPY . .

ENV CI=1

RUN pnpm install --frozen-lockfile

RUN pnpm --filter shared build

RUN cd apps/api && npx prisma generate

RUN pnpm --filter api build

# -----------------------------------------------------------------------------
# Stage 2: Runner – production image with only runtime artifacts
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Copy workspace layout and root node_modules (pnpm store / hoisted deps)
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy shared package (API depends on it via workspace)
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/dist ./packages/shared/

# Copy API runtime: dist, package.json, prisma schema (for migrations if run from same image)
COPY --from=builder /app/apps/api/package.json /app/apps/api/dist /app/apps/api/prisma ./apps/api/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

RUN mkdir -p /app/apps/api/uploads

ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
