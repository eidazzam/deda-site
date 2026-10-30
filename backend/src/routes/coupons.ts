import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { validateCoupon, type CouponInvalidReason } from '../lib/pricing.js';

const validateBodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  // Client passes the current cart subtotal so we can check minOrderAmount.
  subtotal: z.number().int().nonnegative(),
});

const REASON_MESSAGES: Record<CouponInvalidReason, string> = {
  'not-found': 'Coupon code is not valid',
  inactive: 'This coupon has been disabled',
  expired: 'This coupon has expired',
  exhausted: 'This coupon has reached its usage limit',
  'min-order-not-met': 'Order total is below the minimum for this coupon',
};

export const couponRoutes: FastifyPluginAsync = async (app) => {
  app.post('/coupons/validate', async (req, reply) => {
    const body = validateBodySchema.parse(req.body);
    const result = await validateCoupon(prisma, body.code, body.subtotal);

    if (!result.valid) {
      return reply.code(400).send({
        error: {
          code: `COUPON_${result.reason.replace('-', '_').toUpperCase()}`,
          message: REASON_MESSAGES[result.reason],
        },
      });
    }

    return {
      data: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        discount: result.discount,
      },
    };
  });
};
