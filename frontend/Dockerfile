# ─────────────────────────────────────────────────────────
# Stage 1 — install & build Next.js
# ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Accept BACKEND_URL as a build arg so the rewrites in next.config.js point to the right service
ARG BACKEND_URL=http://api:4000
ENV BACKEND_URL=$BACKEND_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────
# Stage 2 — lean production image
# ─────────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

ENV NODE_ENV=production
ARG BACKEND_URL=http://api:4000
ENV BACKEND_URL=$BACKEND_URL

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start"]

