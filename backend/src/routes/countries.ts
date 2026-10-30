import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../lib/prisma.js';

// Country list rarely changes — same SWR window as governorates so the
// checkout page is one query lighter under load.
const STATIC_CACHE = 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600';

export const countryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/countries', async (_req, reply) => {
    reply.header('Cache-Control', STATIC_CACHE);
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        nameEn: true,
        nameAr: true,
        shippingFee: true,
      },
    });
    return { data: countries };
  });
};
