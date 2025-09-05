# Multi-stage Dockerfile for Rentify API

# Stage 1: Install prod dependencies only
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Use npm ci when lockfile exists; fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Stage 2: Runtime
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Use existing non-root user provided by the base image (node:alpine)
# The image already has user `node` and group `node`

# Copy app files
# Ensure files are owned by the node user for runtime writes (e.g., logs)
COPY --chown=node:node . .
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
