/**
 * Tap-Payments checkout init.
 *
 * The frontend creates the order first with `paymentMethod: 'TAP'` via
 * /api/orders, which leaves it in INITIATED. The customer then hits this
 * endpoint with the orderId; we create a Tap charge, persist the Payment
 * row, and return the hosted-page URL the storefront redirects to.
 *
 * Webhook updates (status, method) land separately on /api/webhooks/tap.
 * The customer is bounced back to /checkout/return on the storefront
 * which polls /api/orders/:id/status until the webhook has caught up.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { PaymentMethod, PaymentStatus } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';
import { formatOrderNumber } from '../lib/order-number.js';
import {
  createCharge,
  isTapConfigured,
  isTapMockMode,
  TapError,
} from '../lib/tap-client.js';

const initSchema = z.object({
  orderId: z.number().int().positive(),
  // Optional locale so the redirect lands on the right storefront tree
  // (/ar/checkout/return vs /en/checkout/return).
  locale: z.enum(['ar', 'en']).default('ar'),
});

export const checkoutTapRoutes: FastifyPluginAsync = async (app) => {
  app.post('/checkout/tap/init', async (req) => {
    if (!isTapConfigured()) {
      throw badRequest(
        'TAP_NOT_CONFIGURED',
        'Online payments are not available yet. Pick Cash on Delivery instead.',
      );
    }

    const input = initSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { payment: true },
    });
    if (!order) throw badRequest('ORDER_NOT_FOUND', 'Order not found');
    if (order.paymentMethod === 'COD') {
      throw badRequest(
        'NOT_AN_ONLINE_ORDER',
        'This order is COD — no online payment needed.',
      );
    }
    if (order.payment && order.payment.status === 'CAPTURED') {
      throw badRequest('ALREADY_PAID', 'This order has already been paid.');
    }

    // If a previous attempt left a redirect URL behind and we're still
    // INITIATED, reuse it instead of opening a second Tap charge — the
    // customer just hit "retry" on /checkout/cancel.
    if (
      order.payment &&
      order.payment.status === 'INITIATED' &&
      order.payment.redirectUrl
    ) {
      return { data: { redirectUrl: order.payment.redirectUrl } };
    }

    const orderNumber = formatOrderNumber(order.id);
    const redirectUrl = `${env.PUBLIC_SITE_URL}/${input.locale}/checkout/return?o=${order.id}`;
    // Webhook URL must point at the API host, not the storefront. In
    // production those are different — Cloudflare Pages serves the
    // storefront (no /api/* route) while api.dedawomenswear.shop fronts this
    // container. Fall back to PUBLIC_SITE_URL for local-dev where both
    // share a host. The storefront also polls /api/orders/:id/status as
    // a backstop if the webhook never arrives.
    const apiBase = env.PUBLIC_API_URL ?? env.PUBLIC_SITE_URL;
    const webhookUrl = `${apiBase}/api/webhooks/tap`;

    // -- Mock mode short-circuit --------------------------------------------
    // Skip Tap entirely. We synthesise a charge id, persist the Payment
    // row, and send the customer to our own simulator page which calls
    // /api/checkout/tap/mock-simulate to flip the status with a button.
    if (isTapMockMode()) {
      const mockChargeId = `mock_chg_${order.id}_${Date.now()}`;
      const mockRedirectUrl = `${env.PUBLIC_SITE_URL}/${input.locale}/checkout/mock-tap?o=${order.id}`;
      await prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          provider: 'TAP',
          tapChargeId: mockChargeId,
          status: 'INITIATED',
          amount: order.total,
          redirectUrl: mockRedirectUrl,
        },
        update: {
          tapChargeId: mockChargeId,
          status: 'INITIATED',
          redirectUrl: mockRedirectUrl,
        },
      });
      return { data: { redirectUrl: mockRedirectUrl } };
    }

    let charge;
    try {
      charge = await createCharge({
        amount: order.total / 1000, // fils → KWD major unit
        currency: 'KWD',
        description: `Deda Order ${orderNumber}`,
        referenceTransaction: orderNumber,
        customer: {
          firstName: order.customerName,
          phone: order.phone1,
          email: null,
        },
        redirectUrl,
        webhookUrl,
      });
    } catch (err) {
      if (err instanceof TapError) {
        throw badRequest(err.code, err.message);
      }
      throw err;
    }

    const tapRedirect = charge.transaction?.url;
    if (!tapRedirect) {
      throw badRequest(
        'TAP_REDIRECT_MISSING',
        'Tap did not return a redirect URL',
      );
    }

    // Upsert: the Payment row may exist from a previous attempt that
    // hit Tap but never made it to CAPTURED.
    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: 'TAP',
        tapChargeId: charge.id,
        status: 'INITIATED',
        amount: order.total,
        redirectUrl: tapRedirect,
      },
      update: {
        tapChargeId: charge.id,
        status: 'INITIATED',
        redirectUrl: tapRedirect,
      },
    });

    return { data: { redirectUrl: tapRedirect } };
  });

  // -------------------------------------------------------------------------
  // POST /api/checkout/tap/mock-simulate
  // Local-dev only. Reproduces what the real Tap webhook would do —
  // flip Payment + Order.paymentStatus to the requested outcome — so the
  // simulator page can drive the full flow without an external account.
  // -------------------------------------------------------------------------
  app.post('/checkout/tap/mock-simulate', async (req) => {
    if (!isTapMockMode()) {
      throw notFound('NOT_FOUND', 'Mock simulator is disabled');
    }

    const body = z
      .object({
        orderId: z.number().int().positive(),
        outcome: z.enum(['CAPTURED', 'FAILED', 'CANCELLED']),
        // Optional — what method to pretend the customer used. Mirrors
        // what Tap would report back in source.payment_method.
        method: z
          .enum(['KNET', 'CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'MADA', 'BENEFIT'])
          .default('KNET'),
      })
      .parse(req.body);

    const payment = await prisma.payment.findUnique({
      where: { orderId: body.orderId },
    });
    if (!payment) {
      throw notFound('PAYMENT_NOT_FOUND', 'No payment row for that order');
    }

    const nextStatus = body.outcome as PaymentStatus;
    const method = body.method as PaymentMethod;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          method,
          rawPayload: {
            mock: true,
            outcome: body.outcome,
            timestamp: new Date().toISOString(),
          },
        },
      }),
      prisma.order.update({
        where: { id: body.orderId },
        data: {
          paymentStatus: nextStatus,
          paymentMethod: method,
        },
      }),
    ]);

    return { data: { ok: true, status: nextStatus } };
  });
};
