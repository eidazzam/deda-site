import type { FastifyPluginAsync } from 'fastify';
import { LeadStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

const LEAD_STATUSES = Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]];

const listQuerySchema = z.object({
  status: z.enum([...LEAD_STATUSES, 'ALL'] as [string, ...string[]]).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  adminNotes: z.string().trim().max(1000).nullable().optional(),
});

export const adminLeadRoutes: FastifyPluginAsync = async (app) => {
  app.get('/leads', async (req) => {
    const q = listQuerySchema.parse(req.query);

    const where: Prisma.LeadWhereInput = {
      ...(q.status !== 'ALL' ? { status: q.status as LeadStatus } : {}),
      ...(q.unreadOnly ? { viewedAt: null } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search } },
              { productNameEn: { contains: q.search, mode: 'insensitive' } },
              { productNameAr: { contains: q.search } },
            ],
          }
        : {}),
    };

    const skip = (q.page - 1) * q.limit;

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: q.limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      data: {
        items: items.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          productSlug: l.productSlug,
          productNameEn: l.productNameEn,
          productNameAr: l.productNameAr,
          colorName: l.colorName,
          size: l.size,
          status: l.status,
          isUnread: l.viewedAt === null,
          adminNotes: l.adminNotes,
          createdAt: l.createdAt.toISOString(),
        })),
        pagination: {
          page: q.page,
          limit: q.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      },
    };
  });

  app.get('/leads/unread-count', async () => {
    const count = await prisma.lead.count({ where: { viewedAt: null } });
    return { data: { count } };
  });

  app.patch<{ Params: { id: string } }>('/leads/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('LEAD_NOT_FOUND', 'Lead not found');
    }
    const body = updateLeadSchema.parse(req.body);

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
        // Opening / mutating implicitly marks the lead as viewed
        viewedAt: new Date(),
      },
    });

    return {
      data: {
        id: lead.id,
        status: lead.status,
        adminNotes: lead.adminNotes,
      },
    };
  });
};
