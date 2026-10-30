# syntax=docker/dockerfile:1.7
#
# Three-stage build for the Fastify API.
#
#   deps     — installs all npm dependencies once and caches them
#   builder  — runs `prisma generate` and tsc → produces dist/
#   runtime  — copies only what's needed at run time, runs as non-root
#
# Sharp ships native libvips bindings; alpine + libc6-compat covers what
# the prebuilt wheel needs without forcing a full rebuild.

ARG NODE_VERSION=22-alpine

# ----- deps -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ----- builder --------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ----- runtime --------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache libc6-compat tini
ENV NODE_ENV=production \
    UPLOAD_DIR=/app/uploads
WORKDIR /app

# Create a non-root user we'll run the process under, and pre-create the
# uploads directory so the volume mount inherits the right ownership.
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /app/uploads \
 && chown -R app:app /app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/server.js"]
