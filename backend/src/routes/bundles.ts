import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../lib/prisma.js';

// Bundles are merchandised manually and change infrequently. Match the
// catalog SWR window so the homepage stays snappy.
const CATALOG_CACHE = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';

export const bundleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/bundles', async (_req, reply) => {
    reply.header('Cache-Control', CATALOG_CACHE);
    const bundles = await prisma.bundle.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              include: {
                variants: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                  include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
                },
                images: {
                  where: { variantId: null },
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return {
      data: bundles.map((b) => ({
        id: b.id,
        slug: b.slug,
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        descriptionEn: b.descriptionEn,
        descriptionAr: b.descriptionAr,
        bundlePrice: b.bundlePrice,
        originalPrice: b.originalPrice,
        savings: b.originalPrice - b.bundlePrice,
        imageUrl: b.imageUrl,
        products: b.products.map((bp) => ({
          slug: bp.product.slug,
          nameEn: bp.product.nameEn,
          nameAr: bp.product.nameAr,
          primaryImage:
            bp.product.images[0]?.url ?? bp.product.variants[0]?.images[0]?.url ?? null,
        })),
      })),
    };
  });
};
