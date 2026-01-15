# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY tsconfig.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY apps/crawler-service/package.json ./apps/crawler-service/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/crawler-service/ ./apps/crawler-service/

RUN pnpm --filter @protecliter/database prisma generate
RUN pnpm --filter crawler-service build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/crawler-service/dist ./apps/crawler-service/dist
COPY --from=builder /app/apps/crawler-service/package.json ./apps/crawler-service/

USER nestjs

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002

CMD ["node", "apps/crawler-service/dist/main.js"]
