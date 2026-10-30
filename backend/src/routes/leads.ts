import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';

const outOfStockSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(120),
  productSlug: z.string().min(1),
  colorName: z.string().trim().max(60).optional().nullable(),
  size: z.string().trim().max(10).optional().nullable(),
});

export const leadRoutes: FastifyPluginAsync = async (app) => {
  // Customer requests to be notified when an out-of-stock product returns.
  app.post('/leads/out-of-stock', async (req, reply) => {
    const input = outOfStockSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { slug: input.productSlug },
      select: { id: true, slug: true, nameEn: true, nameAr: true },
    });
    if (!product) {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    await prisma.lead.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        productId: product.id,
        productSlug: product.slug,
        productNameEn: product.nameEn,
        productNameAr: product.nameAr,
        colorName: input.colorName ?? null,
        size: input.size ?? null,
      },
    });

    return reply.code(201).send({ data: { ok: true } });
  });
};
