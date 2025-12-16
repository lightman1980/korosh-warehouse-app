# ================================================
# Dockerfile for Software Installer Application
# Optimized for Production Deployment 2025
# ================================================

# Multi-stage build for optimization
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini \
    postgresql-client \
    mysql-client \
    redis-tools

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create data directory
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as init system
ENTRYPOINT ["tini", "--"]

# Start application
CMD ["npm", "start"]

# ================================================
# Platform-specific Builds
# ================================================

# Mobile Build (React Native)
FROM node:18-alpine AS mobile-builder

WORKDIR /app

# Install mobile build dependencies
RUN apk add --no-cache \
    openjdk11 \
    android-sdk \
    gradle

# Copy React Native project
COPY mobile-app/ ./mobile-app/

# Install dependencies and build APK
WORKDIR /app/mobile-app
RUN npm ci && \
    npm run build:android

# Desktop Build (Electron)
FROM node:18-alpine AS desktop-builder

WORKDIR /app

# Install desktop build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    xvfb-run

# Copy Electron project
COPY desktop-app/ ./desktop-app/

# Install dependencies and build
WORKDIR /app/desktop-app
RUN npm ci && \
    npm run build && \
    npm run package

# ================================================
# Production Image with Multiple Platform Support
# ================================================

FROM node:18-alpine AS production-multi

# Install runtime dependencies for all platforms
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini \
    postgresql-client \
    mysql-client \
    redis-tools \
    openjdk11 \
    android-sdk \
    gradle \
    python3 \
    make \
    g++ \
    xvfb-run

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy node modules from different builds
COPY --from=builder /app/node_modules ./node_modules
COPY --from=mobile-builder /app/mobile-app ./mobile-app
COPY --from=desktop-builder /app/desktop-app ./desktop-app

# Copy main application
COPY --chown=nodejs:nodejs . .

# Create data directories
RUN mkdir -p /app/data /app/mobile-builds /app/desktop-builds && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["npm", "start"]

# ================================================
# Kubernetes Deployment
# ================================================

FROM node:18-alpine AS k8s

# Add kubectl and helm for cloud operations
RUN apk add --no-cache \
    curl \
    kubectl \
    helm

# Copy application
WORKDIR /app
COPY --from=production /app .

# Kubernetes health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Kubernetes deployment specific
USER 1001
EXPOSE 3000

CMD ["npm", "start"]