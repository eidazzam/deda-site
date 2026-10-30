import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../lib/prisma.js';

/**
 * Public category-image map. The storefront's homepage merges the rows
 * returned here over its hardcoded fallback list — any category without
 * an admin upload keeps its built-in image, the rest swap in.
 */
export const categoryImageRoutes: FastifyPluginAsync = async (app) => {
  app.get('/category-images', async () => {
    const rows = await prisma.categoryCardImage.findMany({
      select: { category: true, url: true },
    });
    return { data: rows };
  });
};
