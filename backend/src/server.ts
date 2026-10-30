import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';

import { env, corsOrigins } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { registerErrorHandler } from './lib/errors.js';
import { registerAuth } from './plugins/auth.js';

import { healthRoutes } from './routes/health.js';
import { productRoutes } from './routes/products.js';
import { governorateRoutes } from './routes/governorates.js';
import { orderRoutes } from './routes/orders.js';
import { siteConfigRoutes } from './routes/site-config.js';
import { categoryImageRoutes } from './routes/category-images.js';
import { adminLoginRoutes } from './routes/admin/login.js';
import { adminOrderRoutes } from './routes/admin/orders.js';
import { adminProductRoutes } from './routes/admin/products.js';
import { adminUploadRoutes } from './routes/admin/uploads.js';
import { adminGovernorateRoutes } from './routes/admin/governorates.js';
import { adminStatsRoutes } from './routes/admin/stats.js';
import { adminSiteConfigRoutes } from './routes/admin/site-config.js';
import { adminCategoryImageRoutes } from './routes/admin/category-images.js';

const app = Fastify({
  logger:
    env.NODE_ENV === 'development'
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }
      : { level: 'info' },
  trustProxy: true,
  bodyLimit: 1024 * 1024,
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, { origin: corsOrigins, credentials: true });

// Global rate limit — generous default (200 req/min per IP) that lets
// real browsing through untouched but stops obvious floods. Individual
// routes can override with tighter caps via `config.rateLimit` (see
// admin/login for the login-attempt lockout).
//
// Deda is cash-on-delivery only — no payment-gateway webhooks to let
// through, so the allow-list is just the empty default.
await app.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
  keyGenerator: (req) => (req.headers['x-real-ip'] as string) || req.ip,
});

await app.register(sensible);
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fieldSize: 1024 * 1024 },
});
await registerAuth(app);

registerErrorHandler(app);

// ---------------------------------------------------------------------------
// Storefront — public. Mounted under /api so Nginx's `location /api/`
// reverse proxy reaches everything.
// ---------------------------------------------------------------------------
await app.register(
  async (api) => {
    await api.register(healthRoutes);
    await api.register(productRoutes);
    await api.register(governorateRoutes);
    await api.register(orderRoutes);
    await api.register(siteConfigRoutes);
    await api.register(categoryImageRoutes);
  },
  { prefix: '/api' },
);

// ---------------------------------------------------------------------------
// Admin — login + /me are open, everything else requires a JWT.
// Two scopes share /api/admin so the URL stays clean either way.
// ---------------------------------------------------------------------------
await app.register(
  async (admin) => {
    await admin.register(adminLoginRoutes);
  },
  { prefix: '/api/admin' },
);

await app.register(
  async (admin) => {
    admin.addHook('preHandler', app.authenticate);
    await admin.register(adminOrderRoutes);
    await admin.register(adminProductRoutes);
    await admin.register(adminUploadRoutes);
    await admin.register(adminGovernorateRoutes);
    await admin.register(adminStatsRoutes);
    await admin.register(adminSiteConfigRoutes);
    await admin.register(adminCategoryImageRoutes);
  },
  { prefix: '/api/admin' },
);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
