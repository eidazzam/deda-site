import type { FastifyPluginAsync } from 'fastify';
import { OrderStatus } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

export const adminStatsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats', async () => {
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);

    const [
      totalOrders,
      pendingOrders,
      newOrdersCount,
      revenueAgg,
      ordersLast30d,
      productsCount,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { viewedAt: null } }),
      // Lifetime non-cancelled revenue
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: OrderStatus.CANCELLED } },
      }),
      // Daily order counts for the last 30 days, used by the chart
      prisma.$queryRaw<{ day: Date; count: bigint; revenue: bigint }[]>`
        SELECT
          date_trunc('day', "createdAt") AS day,
          COUNT(*)::bigint AS count,
          COALESCE(SUM(CASE WHEN status <> 'CANCELLED' THEN total ELSE 0 END), 0)::bigint AS revenue
        FROM "Order"
        WHERE "createdAt" >= ${since30d}
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.product.count(),
    ]);

    const totalRevenue = revenueAgg._sum.total ?? 0;
    const aov =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      data: {
        totalOrders,
        pendingOrders,
        newOrdersCount,
        // Lead/coupon counts retired alongside their tables — kept at 0
        // so the admin dashboard's existing UI doesn't need to branch.
        unreadLeads: 0,
        totalRevenue,
        averageOrderValue: aov,
        productsCount,
        activeCoupons: 0,
        last30Days: ordersLast30d.map((row: { day: Date; count: bigint; revenue: bigint }) => ({
          day: row.day.toISOString().slice(0, 10),
          orders: Number(row.count),
          revenue: Number(row.revenue),
        })),
      },
    };
  });
};
