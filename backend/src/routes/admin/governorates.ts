import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

const updateSchema = z.object({
  shippingFee: z.number().int().nonnegative().max(10_000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const adminGovernorateRoutes: FastifyPluginAsync = async (app) => {
  // List every governorate (including inactive ones) so the admin can flip
  // them back on.
  app.get('/governorates', async () => {
    const govs = await prisma.governorate.findMany({ orderBy: { sortOrder: 'asc' } });
    return { data: govs };
  });

  app.patch<{ Params: { id: string } }>('/governorates/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('GOVERNORATE_NOT_FOUND', 'Governorate not found');
    }
    const body = updateSchema.parse(req.body);

    const updated = await prisma.governorate
      .update({
        where: { id },
        data: {
          ...(body.shippingFee !== undefined ? { shippingFee: body.shippingFee } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      })
      .catch(() => {
        throw notFound('GOVERNORATE_NOT_FOUND', 'Governorate not found');
      });
    return { data: updated };
  });
};
