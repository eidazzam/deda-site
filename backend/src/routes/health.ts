import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    ok: true,
    service: 'deda-api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/db', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: 'connected' };
    } catch (err) {
      app.log.error({ err }, 'Database health check failed');
      return reply.code(503).send({ ok: false, db: 'unreachable' });
    }
  });
};
