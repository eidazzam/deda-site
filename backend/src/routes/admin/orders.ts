import type { FastifyPluginAsync } from 'fastify';
import { OrderStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { formatOrderNumber } from '../../lib/order-number.js';

const ORDER_STATUSES = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];

const listQuerySchema = z.object({
  status: z.enum([...ORDER_STATUSES, 'ALL'] as [string, ...string[]]).default('ALL'),
  search: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  // Max bumped to 500 so the admin's PDF export can pull a meaningful
  // batch in one request. The dashboard pagination still uses 25, so
  // this only matters for the export-print route.
  limit: z.coerce.number().int().min(1).max(500).default(25),
  // newest first by default — orders are usually time-sensitive
  sort: z.enum(['newest', 'oldest']).default('newest'),
  // ?unreadOnly=true → only orders the admin hasn't opened yet
  unreadOnly: z.coerce.boolean().optional(),
});

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  adminNotes: z.string().trim().max(1000).nullable().optional(),
});

export const adminOrderRoutes: FastifyPluginAsync = async (app) => {
  // ---- list ---------------------------------------------------------------
  app.get('/orders', async (req) => {
    const q = listQuerySchema.parse(req.query);

    const where: Prisma.OrderWhereInput = {
      ...(q.status !== 'ALL' ? { status: q.status as OrderStatus } : {}),
      ...(q.unreadOnly ? { viewedAt: null } : {}),
      ...(q.search
        ? {
            OR: [
              { customerName: { contains: q.search, mode: 'insensitive' } },
              { phone1: { contains: q.search } },
              { phone2: { contains: q.search } },
              // search "BA-2901" by stripping the prefix into an id lookup
              ...(/^ba-?\d+$/i.test(q.search)
                ? [
                    {
                      id:
                        Math.max(
                          1,
                          Number(q.search.replace(/^ba-?/i, '')) - 2900,
                        ),
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const skip = (q.page - 1) * q.limit;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: q.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: q.limit,
        include: {
          // Pull enough item detail that the printable orders report can
          // render a product summary per order without a second round
          // trip per row. The product relation gives us the category —
          // it's nullable because a deleted product zeroes out productId.
          items: {
            select: {
              productNameEn: true,
              productNameAr: true,
              colorNameEn: true,
              colorNameAr: true,
              size: true,
              quantity: true,
              product: { select: { category: true } },
            },
            orderBy: { id: 'asc' },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: {
        items: items.map((o) => ({
          id: o.id,
          orderNumber: formatOrderNumber(o.id),
          customerName: o.customerName,
          phone1: o.phone1,
          countryCode: o.countryCode,
          governorateName: o.governorateName,
          address: o.address,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          total: o.total,
          status: o.status,
          itemsCount: o.items.reduce((s, x) => s + x.quantity, 0),
          items: o.items.map((it) => ({
            productNameEn: it.productNameEn,
            productNameAr: it.productNameAr,
            colorNameEn: it.colorNameEn,
            colorNameAr: it.colorNameAr,
            size: it.size,
            quantity: it.quantity,
            category: it.product?.category ?? null,
          })),
          isUnread: o.viewedAt === null,
          createdAt: o.createdAt.toISOString(),
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

  // ---- unread count -------------------------------------------------------
  // Used by the nav badge — polled every ~30s on the admin shell.
  app.get('/orders/unread-count', async () => {
    const count = await prisma.order.count({ where: { viewedAt: null } });
    return { data: { count } };
  });

  // ---- detail -------------------------------------------------------------
  app.get<{ Params: { id: string } }>('/orders/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('ORDER_NOT_FOUND', 'Order not found');
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { id: 'asc' } },
        payment: true,
      },
    });
    if (!order) throw notFound('ORDER_NOT_FOUND', 'Order not found');

    // Mark as viewed the first time the admin opens it
    if (!order.viewedAt) {
      await prisma.order.update({
        where: { id },
        data: { viewedAt: new Date() },
      });
    }

    return {
      data: {
        id: order.id,
        orderNumber: formatOrderNumber(order.id),
        customerName: order.customerName,
        phone1: order.phone1,
        phone2: order.phone2,
        countryCode: order.countryCode,
        governorateName: order.governorateName,
        address: order.address,
        notes: order.notes,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        total: order.total,
        couponCode: order.couponCode,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        adminNotes: order.adminNotes,
        payment: order.payment
          ? {
              tapChargeId: order.payment.tapChargeId,
              status: order.payment.status,
              method: order.payment.method,
              amount: order.payment.amount,
              refundedAmount: order.payment.refundedAmount,
              createdAt: order.payment.createdAt.toISOString(),
              updatedAt: order.payment.updatedAt.toISOString(),
            }
          : null,
        items: order.items.map((it) => ({
          productSlug: it.productSlug,
          productNameEn: it.productNameEn,
          productNameAr: it.productNameAr,
          colorNameEn: it.colorNameEn,
          colorNameAr: it.colorNameAr,
          colorHex: it.colorHex,
          size: it.size,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    };
  });

  // ---- update status / notes ---------------------------------------------
  // Returns the full detail (same shape as GET /orders/:id) so the admin
  // can call setOrder(updated) without losing fields like items, address,
  // governorate, totals — which would otherwise become undefined and crash
  // the detail page on next render.
  app.patch<{ Params: { id: string } }>('/orders/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('ORDER_NOT_FOUND', 'Order not found');
    }
    const body = updateOrderSchema.parse(req.body);

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
      },
      include: {
        items: { orderBy: { id: 'asc' } },
        payment: true,
      },
    });

    return {
      data: {
        id: order.id,
        orderNumber: formatOrderNumber(order.id),
        customerName: order.customerName,
        phone1: order.phone1,
        phone2: order.phone2,
        countryCode: order.countryCode,
        governorateName: order.governorateName,
        address: order.address,
        notes: order.notes,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        total: order.total,
        couponCode: order.couponCode,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        adminNotes: order.adminNotes,
        payment: order.payment
          ? {
              tapChargeId: order.payment.tapChargeId,
              status: order.payment.status,
              method: order.payment.method,
              amount: order.payment.amount,
              refundedAmount: order.payment.refundedAmount,
              createdAt: order.payment.createdAt.toISOString(),
              updatedAt: order.payment.updatedAt.toISOString(),
            }
          : null,
        items: order.items.map((it) => ({
          productSlug: it.productSlug,
          productNameEn: it.productNameEn,
          productNameAr: it.productNameAr,
          colorNameEn: it.colorNameEn,
          colorNameAr: it.colorNameAr,
          colorHex: it.colorHex,
          size: it.size,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal,
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    };
  });

  // DELETE :id — fully drops the order row. OrderItem + Payment cascade
  // via the schema's onDelete rules. Used by the admin list "Delete"
  // button to clean up test / cancelled orders.
  app.delete<{ Params: { id: string } }>('/orders/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw notFound('ORDER_NOT_FOUND', 'Order not found');
    }
    const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound('ORDER_NOT_FOUND', 'Order not found');
    await prisma.order.delete({ where: { id } });
    return reply.code(204).send();
  });
};
