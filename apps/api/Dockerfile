FROM node:22-alpine AS base
RUN corepack enable pnpm

# ─── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter api...

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY apps/api ./apps/api
COPY prisma ./prisma
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable pnpm
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3002

CMD ["node", "dist/main"]
