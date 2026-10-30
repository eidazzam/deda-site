/**
 * Tap webhook receiver.
 *
 * Tap calls this URL (configured as `post.url` on the charge) every time
 * a charge transitions: CAPTURED, FAILED, CANCELLED, etc. We:
 *   1. Verify the HMAC signature in the `hashstring` header.
 *   2. Look up the Payment row by tapChargeId (idempotent — we ignore
 *      duplicates with the same status).
 *   3. Verify the amount Tap reports matches the order total so a
 *      tampered webhook can't mark an order paid for the wrong amount.
 *   4. Update Payment + Order.paymentStatus. The Order.status workflow
 *      (PENDING → CONFIRMED → SHIPPED) stays under admin control.
 *
 * Always returns 200 to Tap, even on internal errors, so they don't
 * retry forever — we log + alert on our side instead.
 */
import type { FastifyPluginAsync } from 'fastify';
import { PaymentMethod } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import {
  mapTapStatusToPaymentStatus,
  verifyWebhookSignature,
} from '../lib/tap-client.js';

type TapWebhookPayload = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  source?: { payment_method?: string };
  // Tap nests merchant + payment + gateway references under here. We
  // pull the hash inputs (`gateway`, `payment`) out for signature
  // verification.
  reference?: {
    gateway?: string;
    payment?: string;
    transaction?: string;
  };
  // The created timestamp lives on the transaction sub-object, not at
  // the top level despite what the docs imply.
  transaction?: { created?: number | string };
};

// Tap's source.payment_method strings → our PaymentMethod enum. Anything
// we don't recognise stays as CARD (the safest default for "online").
function mapMethod(raw?: string): PaymentMethod {
  const s = (raw ?? '').toUpperCase();
  if (s.includes('KNET')) return PaymentMethod.KNET;
  if (s.includes('APPLE')) return PaymentMethod.APPLE_PAY;
  if (s.includes('GOOGLE')) return PaymentMethod.GOOGLE_PAY;
  if (s.includes('MADA')) return PaymentMethod.MADA;
  if (s.includes('BENEFIT')) return PaymentMethod.BENEFIT;
  return PaymentMethod.CARD;
}

export const webhooksTapRoutes: FastifyPluginAsync = async (app) => {
  app.post('/webhooks/tap', async (req, reply) => {
    const payload = req.body as TapWebhookPayload | undefined;
    if (!payload || !payload.id) {
      app.log.warn({ body: req.body }, 'tap webhook with empty body');
      return reply.code(200).send({ ok: true });
    }

    if (!verifyWebhookSignature(req.headers as Record<string, string>, payload)) {
      app.log.warn({ chargeId: payload.id }, 'tap webhook signature mismatch');
      // Tap retries on non-2xx, but a wrong signature isn't going to
      // get any righter on retry — 200 it.
      return reply.code(200).send({ ok: true });
    }

    const payment = await prisma.payment.findUnique({
      where: { tapChargeId: payload.id },
      include: { order: true },
    });
    if (!payment) {
      app.log.warn({ chargeId: payload.id }, 'tap webhook for unknown charge');
      return reply.code(200).send({ ok: true });
    }

    // Amount sanity check. Tap returns the major unit (e.g. 29 for
    // 29 KWD); our DB stores fils.
    const expectedMajor = payment.amount / 1000;
    if (Math.abs(Number(payload.amount) - expectedMajor) > 0.001) {
      app.log.error(
        { chargeId: payload.id, expectedMajor, got: payload.amount },
        'tap webhook amount mismatch — refusing to update',
      );
      return reply.code(200).send({ ok: true });
    }

    const nextStatus = mapTapStatusToPaymentStatus(payload.status);

    // Idempotency: if status hasn't moved we still refresh the raw
    // payload so an admin can see the latest Tap state, but we skip the
    // Order update so we don't reset side-effects.
    if (payment.status === nextStatus) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { rawPayload: payload as unknown as object },
      });
      return reply.code(200).send({ ok: true });
    }

    const method = mapMethod(payload.source?.payment_method);

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          method,
          rawPayload: payload as unknown as object,
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: nextStatus,
          // Replace the placeholder CARD we wrote at order-create time
          // with the real method Tap eventually used. Only happens once
          // — subsequent webhooks for the same charge don't churn it.
          paymentMethod: method,
        },
      }),
    ]);

    app.log.info(
      { chargeId: payload.id, orderId: payment.orderId, nextStatus },
      'tap webhook processed',
    );

    return reply.code(200).send({ ok: true });
  });
};
