import type { FastifyPluginAsync } from 'fastify';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { badRequest } from '../lib/errors.js';
import { unitPriceOf, validateCoupon } from '../lib/pricing.js';
import { formatOrderNumber } from '../lib/order-number.js';

// Free shipping kicks in once the cart subtotal reaches these thresholds.
// Stored in fils to match every other money field in the codebase.
const FREE_SHIPPING_LOCAL_FILS = 30_000;   // Kuwait orders → 30 KWD
const FREE_SHIPPING_INTL_FILS  = 100_000;  // International   → 100 KWD
const KUWAIT_CODE = 'KW';

const orderItemSchema = z.object({
  productSlug: z.string().min(1),
  colorNameEn: z.string().min(1),
  // Sizes are usually 2-3 chars ("S", "52", "M/L"), but the storefront
  // also supports a "custom size" path that submits the label as a
  // human-readable string like "مقاس خاص · 63" / "Custom · 63". Bump
  // the cap to 40 to cover both shapes.
  size: z.string().min(1).max(40),
  quantity: z.number().int().positive().max(20),
});

// Custom-size labels emitted by the storefront's bespoke-size UI. They
// bypass the variant.sizes whitelist because they're free-form by
// design — the customer is asking for a one-off measurement.
const CUSTOM_SIZE_PREFIXES = ['مقاس خاص', 'Custom'];
function isCustomSize(size: string): boolean {
  return CUSTOM_SIZE_PREFIXES.some((p) => size.startsWith(p));
}

// Deda is cash-on-delivery only. Kept as a one-value enum so the
// schema shape stays stable if a payment gateway is ever added.
const checkoutMethodSchema = z.enum(['COD']).default('COD');

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone1: z.string().trim().min(8).max(20),
  phone2: z.string().trim().min(8).max(20).optional().nullable(),
  // ISO-2 country code. Defaults to Kuwait when the client doesn't send
  // one — keeps older builds of the storefront working during rollout.
  countryCode: z.string().trim().toUpperCase().length(2).default(KUWAIT_CODE),
  // Required only when countryCode === KW; validated inside the handler.
  governorateName: z.string().min(1).optional().nullable(),
  address: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(500).optional().nullable(),
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
  paymentMethod: checkoutMethodSchema,
  items: z.array(orderItemSchema).min(1).max(50),
});

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.post('/orders', async (req, reply) => {
    const input = createOrderSchema.parse(req.body);

    const order = await prisma.$transaction(async (tx) => {
      // ----- 1. Load every product mentioned by the cart in one query -----
      const slugs = [...new Set(input.items.map((i) => i.productSlug))];
      const products = await tx.product.findMany({
        where: { slug: { in: slugs } },
        include: { variants: true },
      });
      const productBySlug = new Map(products.map((p) => [p.slug, p]));

      // ----- 2. Validate each cart item against the live catalog --------
      let subtotal = 0;
      const lineItems: {
        productId: number;
        productSlug: string;
        productNameEn: string;
        productNameAr: string;
        colorNameEn: string;
        colorNameAr: string;
        colorHex: string;
        size: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[] = [];

      for (const item of input.items) {
        const product = productBySlug.get(item.productSlug);
        if (!product) {
          throw badRequest('PRODUCT_NOT_FOUND', `Product not found: ${item.productSlug}`);
        }
        if (product.status !== SaleStatus.IN_SALE) {
          throw badRequest(
            'PRODUCT_OUT_OF_STOCK',
            `Product is no longer available: ${product.nameEn}`,
          );
        }

        const variant = product.variants.find((v) => v.colorNameEn === item.colorNameEn);
        if (!variant) {
          throw badRequest(
            'COLOR_NOT_FOUND',
            `Colour "${item.colorNameEn}" is not available for ${product.nameEn}`,
          );
        }
        if (variant.status !== SaleStatus.IN_SALE) {
          throw badRequest(
            'COLOR_OUT_OF_STOCK',
            `Colour "${variant.colorNameEn}" is out of stock for ${product.nameEn}`,
          );
        }
        // Custom sizes are free-form requests (one-off measurements) and
        // therefore don't need to match the variant's standard sizes.
        if (!isCustomSize(item.size) && !variant.sizes.includes(item.size)) {
          throw badRequest(
            'SIZE_NOT_FOUND',
            `Size "${item.size}" is not available for ${product.nameEn}`,
          );
        }

        const unitPrice = unitPriceOf(product);
        const lineSubtotal = unitPrice * item.quantity;
        subtotal += lineSubtotal;

        lineItems.push({
          productId: product.id,
          productSlug: product.slug,
          productNameEn: product.nameEn,
          productNameAr: product.nameAr,
          colorNameEn: variant.colorNameEn,
          colorNameAr: variant.colorNameAr,
          colorHex: variant.colorHex,
          size: item.size,
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
      }

      // ----- 3. Destination + base shipping fee --------------------------
      // Two branches: Kuwait uses the Governorate table; everywhere else
      // uses the Country table with a single flat per-country fee.
      let baseShippingFee = 0;
      let governorateName: string | null = null;

      if (input.countryCode === KUWAIT_CODE) {
        if (!input.governorateName) {
          throw badRequest(
            'GOVERNORATE_REQUIRED',
            'Governorate is required for Kuwait orders',
          );
        }
        const gov = await tx.governorate.findUnique({
          where: { nameEn: input.governorateName },
        });
        if (!gov || !gov.isActive) {
          throw badRequest('INVALID_GOVERNORATE', 'Selected governorate is not valid');
        }
        baseShippingFee = gov.shippingFee;
        governorateName = gov.nameEn;
      } else {
        const country = await tx.country.findUnique({
          where: { code: input.countryCode },
        });
        if (!country || !country.isActive) {
          throw badRequest('INVALID_COUNTRY', 'Selected country is not valid');
        }
        baseShippingFee = country.shippingFee;
      }

      // ----- 4. Coupon (optional) ---------------------------------------
      let discount = 0;
      let appliedCouponCode: string | null = null;
      if (input.couponCode) {
        const result = await validateCoupon(tx, input.couponCode, subtotal);
        if (!result.valid) {
          throw badRequest(
            `COUPON_${result.reason.replace('-', '_').toUpperCase()}`,
            'Coupon could not be applied',
          );
        }
        discount = result.discount;
        appliedCouponCode = result.coupon.code;
      }

      // Free-shipping promo retired — shipping is always billed at the
      // destination's rate. Threshold constants are kept above so the
      // logic can be restored quickly if the promo returns.
      void FREE_SHIPPING_LOCAL_FILS;
      void FREE_SHIPPING_INTL_FILS;
      void KUWAIT_CODE;
      const shippingFee = baseShippingFee;
      const total = subtotal + shippingFee - discount;

      // ----- 5. Persist --------------------------------------------------
      const created = await tx.order.create({
        data: {
          customerName: input.customerName,
          phone1: input.phone1,
          phone2: input.phone2 ?? null,
          countryCode: input.countryCode,
          governorateName,
          address: input.address,
          notes: input.notes ?? null,
          subtotal,
          shippingFee,
          discount,
          total,
          couponCode: appliedCouponCode,
          // Deda is cash-on-delivery only — payment is collected by the
          // courier on arrival, so there's never a parallel Payment row.
          paymentMethod: PaymentMethod.COD,
          paymentStatus: null,
          items: { create: lineItems },
        },
        include: { items: true },
      });

      if (appliedCouponCode) {
        await tx.coupon.update({
          where: { code: appliedCouponCode },
          data: { usageCount: { increment: 1 } },
        });
      }

      return created;
    });

    return reply.code(201).send({
      data: {
        id: order.id,
        orderNumber: formatOrderNumber(order.id),
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt.toISOString(),
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/orders/:id/status
  // Lightweight poll endpoint used by /checkout/return after Tap redirects
  // the customer back. Public on purpose: the orderId is opaque enough
  // (next available auto-increment) that scraping would only ever leak
  // status/total, which the customer already saw.
  // ---------------------------------------------------------------------------
  app.get<{ Params: { id: string } }>('/orders/:id/status', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw badRequest('INVALID_ORDER_ID', 'Invalid order id');
    }
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
      },
    });
    if (!order) throw badRequest('ORDER_NOT_FOUND', 'Order not found');
    return {
      data: {
        id: order.id,
        orderNumber: formatOrderNumber(order.id),
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        total: order.total,
      },
    };
  });
};
