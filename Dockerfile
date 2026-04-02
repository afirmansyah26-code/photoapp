FROM node:20-slim AS base

# Dependencies for better-sqlite3 and sharp
RUN apt-get update && apt-get install -y \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# --- Builder stage ---
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runner stage ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime deps only
RUN apt-get update && apt-get install -y libvips42 && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Create data directories
RUN mkdir -p /app/data /app/public/uploads/originals /app/public/uploads/collages /app/public/uploads/trash && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
