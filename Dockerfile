# ============ Stage 1: Build ============
FROM node:20-slim AS builder

# Dependencies for better-sqlite3 and sharp
RUN apt-get update && apt-get install -y \
    python3 make g++ libvips-dev unzip zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============ Stage 2: Production ============
FROM node:20-slim AS runner

# Runtime dependencies only (libvips for sharp)
RUN apt-get update && apt-get install -y \
    libvips42 unzip zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app and dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create data directories
RUN mkdir -p /app/data /app/public/uploads/originals /app/public/uploads/collages /app/public/uploads/trash /app/backups && \
    chown -R nextjs:nodejs /app/data /app/public/uploads /app/backups

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
# Limit Node.js memory to prevent OOM on ZimaOS (512MB)
ENV NODE_OPTIONS="--max-old-space-size=512"

CMD ["npm", "start"]
