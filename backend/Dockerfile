# ─────────────────────────────────────────────────────────
# Stage 1 — install + compile TypeScript
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (Docker layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
COPY db ./db
RUN npm run build

# ─────────────────────────────────────────────────────────
# Stage 2 — lean production image
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy compiled output and production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db

ENV NODE_ENV=production

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server.js"]
