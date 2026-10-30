# syntax=docker/dockerfile:1.7
#
# Three-stage build for the Next.js storefront.
#
#   deps     — installs npm dependencies
#   builder  — runs `next build` with output: 'standalone'
#   runtime  — copies the standalone server + static + public; runs node
#
# Public env vars (NEXT_PUBLIC_*) are baked in at build time so they
# need to be present as build args, not just runtime env.

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

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_FB_PIXEL_ID
ARG NEXT_PUBLIC_TIKTOK_PIXEL_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_FB_PIXEL_ID=${NEXT_PUBLIC_FB_PIXEL_ID} \
    NEXT_PUBLIC_TIKTOK_PIXEL_ID=${NEXT_PUBLIC_TIKTOK_PIXEL_ID} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ----- runtime --------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

# Next.js writes the standalone server into .next/standalone and the
# static files into .next/static. We also need /public.
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

USER app
EXPOSE 3000
CMD ["node", "server.js"]
