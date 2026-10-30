import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../lib/prisma.js';

// Governorates change rarely — the admin barely touches them. A 10-minute
// edge cache eliminates them from the per-page render path entirely.
const STATIC_CACHE = 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600';

export const governorateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/governorates', async (_req, reply) => {
    reply.header('Cache-Control', STATIC_CACHE);
    const govs = await prisma.governorate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        nameEn: true,
        nameAr: true,
        shippingFee: true,
      },
    });
    return { data: govs };
  });
};
