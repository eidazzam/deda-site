import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

const updateSchema = z.object({
  // Fees up to 100 KWD (= 100_000 fils) to leave headroom for distant
  // destinations without inviting accidental typos.
  shippingFee: z.number().int().nonnegative().max(100_000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const adminCountryRoutes: FastifyPluginAsync = async (app) => {
  // List every country (including inactive) so the admin can re-enable
  // ones we've paused.
  app.get('/countries', async () => {
    const countries = await prisma.country.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return { data: countries };
  });

  app.patch<{ Params: { id: string } }>('/countries/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('COUNTRY_NOT_FOUND', 'Country not found');
    }
    const body = updateSchema.parse(req.body);

    const updated = await prisma.country
      .update({
        where: { id },
        data: {
          ...(body.shippingFee !== undefined ? { shippingFee: body.shippingFee } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      })
      .catch(() => {
        throw notFound('COUNTRY_NOT_FOUND', 'Country not found');
      });
    return { data: updated };
  });
};
