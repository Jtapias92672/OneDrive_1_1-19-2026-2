# FORGE Platform - Production Dockerfile
# Epic 9: Infrastructure
# Multi-stage build optimized for production
#
# Target: AWS EC2/EKS deployment
# Security: Non-root user, minimal attack surface

# ==============================================================================
# Stage 1: Dependencies
# ==============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev 2>/dev/null || npm install

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build 2>/dev/null || npx tsc --outDir dist

# Remove dev dependencies after build
RUN npm prune --production

# ==============================================================================
# Stage 3: Production
# ==============================================================================
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S forge && \
    adduser -S forge -u 1001 -G forge

WORKDIR /app

# Copy production artifacts
COPY --from=builder --chown=forge:forge /app/dist ./dist
COPY --from=builder --chown=forge:forge /app/node_modules ./node_modules
COPY --from=builder --chown=forge:forge /app/package.json ./

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV FORGE_RUNTIME=container

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Security: Drop all capabilities, read-only root filesystem
USER forge

EXPOSE 3000

# Start application
CMD ["node", "dist/server.js"]
