import type { FastifyPluginAsync } from 'fastify';
import { CouponType } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';

const COUPON_TYPES = Object.values(CouponType) as [CouponType, ...CouponType[]];

const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, dashes, underscores'),
  type: z.enum(COUPON_TYPES),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().nonnegative().nullable().optional(),
  maxDiscount: z.number().int().positive().nullable().optional(),
  // Coupons MUST expire — between 1 and 7 days from now. Tightens the
  // "promo accidentally left on forever" footgun. Optional update path
  // still accepts null, but creates require a real expiry.
  expiresAt: z.string().datetime(),
  usageLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

const updateCouponSchema = createCouponSchema.omit({ code: true }).partial();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Coupon expiry must be at least tomorrow and at most one week away.
// 12-hour grace either side so timezone offsets don't reject a valid date.
function assertExpiryInRange(iso: string) {
  const expiry = new Date(iso).getTime();
  const now = Date.now();
  const minMs = now + ONE_DAY_MS - 12 * 60 * 60 * 1000;
  const maxMs = now + 7 * ONE_DAY_MS + 12 * 60 * 60 * 1000;
  if (expiry < minMs || expiry > maxMs) {
    throw badRequest(
      'EXPIRY_OUT_OF_RANGE',
      'Expiry must be between 1 and 7 days from now',
    );
  }
}

export const adminCouponRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coupons', async () => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return { data: coupons };
  });

  app.get<{ Params: { code: string } }>('/coupons/:code', async (req) => {
    const code = req.params.code.toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw notFound('COUPON_NOT_FOUND', 'Coupon not found');
    return { data: coupon };
  });

  app.post('/coupons', async (req, reply) => {
    const input = createCouponSchema.parse(req.body);

    if (input.type === CouponType.PERCENT && (input.value < 1 || input.value > 100)) {
      throw badRequest('INVALID_PERCENT', 'Percent coupons must be between 1 and 100');
    }

    assertExpiryInRange(input.expiresAt);

    const exists = await prisma.coupon.findUnique({ where: { code: input.code } });
    if (exists) {
      throw badRequest('CODE_TAKEN', `Coupon code "${input.code}" already exists`);
    }

    const created = await prisma.coupon.create({
      data: {
        code: input.code,
        type: input.type,
        value: input.value,
        minOrderAmount: input.minOrderAmount ?? null,
        maxDiscount: input.maxDiscount ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        usageLimit: input.usageLimit ?? null,
        isActive: input.isActive,
      },
    });
    return reply.code(201).send({ data: created });
  });

  app.patch<{ Params: { code: string } }>('/coupons/:code', async (req) => {
    const code = req.params.code.toUpperCase();
    const body = updateCouponSchema.parse(req.body);

    if (
      body.type === CouponType.PERCENT &&
      body.value !== undefined &&
      (body.value < 1 || body.value > 100)
    ) {
      throw badRequest('INVALID_PERCENT', 'Percent coupons must be between 1 and 100');
    }

    if (body.expiresAt) assertExpiryInRange(body.expiresAt);

    const updated = await prisma.coupon
      .update({
        where: { code },
        data: {
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.value !== undefined ? { value: body.value } : {}),
          ...(body.minOrderAmount !== undefined
            ? { minOrderAmount: body.minOrderAmount }
            : {}),
          ...(body.maxDiscount !== undefined ? { maxDiscount: body.maxDiscount } : {}),
          ...(body.expiresAt !== undefined
            ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
            : {}),
          ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      })
      .catch(() => {
        throw notFound('COUPON_NOT_FOUND', 'Coupon not found');
      });

    return { data: updated };
  });

  app.delete<{ Params: { code: string } }>('/coupons/:code', async (req, reply) => {
    const code = req.params.code.toUpperCase();
    await prisma.coupon.delete({ where: { code } }).catch(() => {
      throw notFound('COUPON_NOT_FOUND', 'Coupon not found');
    });
    return reply.code(204).send();
  });
};
