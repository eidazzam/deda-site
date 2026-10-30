import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../lib/prisma.js';

/**
 * Public hero-slider feed. The storefront homepage calls this once on
 * SSR and feeds the result into <HeroSlider>. Only active slides come
 * back, ordered by sortOrder so the admin's "drag-and-drop" placement
 * (well, manual sortOrder integer) is honoured.
 */
export const heroSlideRoutes: FastifyPluginAsync = async (app) => {
  app.get('/hero-slides', async () => {
    const slides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, url: true, altEn: true, altAr: true },
    });
    return { data: slides };
  });
};
