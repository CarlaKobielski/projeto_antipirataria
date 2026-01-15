# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY tsconfig.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY apps/detection-service/package.json ./apps/detection-service/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/detection-service/ ./apps/detection-service/

RUN pnpm --filter @protecliter/database prisma generate
RUN pnpm --filter detection-service build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/detection-service/dist ./apps/detection-service/dist
COPY --from=builder /app/apps/detection-service/package.json ./apps/detection-service/

USER nestjs

EXPOSE 3003

ENV NODE_ENV=production
ENV PORT=3003

CMD ["node", "apps/detection-service/dist/main.js"]
