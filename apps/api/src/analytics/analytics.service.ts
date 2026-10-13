import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(
    tenantId: string,
    data: {
      type: string;
      sessionId?: string;
      customerId?: string;
      payloadJson?: object;
    },
  ) {
    // fire-and-forget insert
    void this.prisma.analyticsEvent
      .create({
        data: {
          id: randomUUID(),
          tenantId,
          type: data.type,
          sessionId: data.sessionId,
          customerId: data.customerId,
          payloadJson: data.payloadJson,
        },
      })
      .catch(() => undefined);
    return { ok: true as const };
  }

  async dashboard(tenantId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      ordersCount,
      revenueAgg,
      pendingPayments,
      eventsByType,
      recentOrders,
      lowStock,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.aggregate({
        where: {
          tenantId,
          createdAt: { gte: since },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.payment.count({
        where: { tenantId, status: { in: ['SUBMITTED', 'VERIFICATION_IN_PROGRESS'] } },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
        },
      }),
      this.prisma.inventoryLevel.findMany({
        where: { tenantId, quantity: { lte: 5 } },
        take: 20,
        include: { variant: true, warehouse: true },
      }),
    ]);

    return {
      periodDays: 30,
      ordersCount,
      revenue: Number(revenueAgg._sum.grandTotal || 0),
      pendingPayments,
      eventsByType: eventsByType.map((e) => ({ type: e.type, count: e._count._all })),
      recentOrders: recentOrders.map((o) => ({
        ...o,
        grandTotal: Number(o.grandTotal),
      })),
      lowStock,
    };
  }

  async reports(tenantId: string, from?: string, to?: string, channel?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();
    const paid = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        ...(channel ? { channel } : {}),
      },
      include: { items: true },
    });
    const productMap = new Map<string, { sku: string; name: string; qty: number; revenue: number }>();
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
    let online = 0;
    let pos = 0;
    for (const o of paid) {
      const h = new Date(o.createdAt).getHours();
      hourly[h].orders += 1;
      hourly[h].revenue += Number(o.grandTotal);
      if (o.channel === 'POS') pos += Number(o.grandTotal);
      else online += Number(o.grandTotal);
      for (const item of o.items) {
        const cur = productMap.get(item.sku) || {
          sku: item.sku,
          name: item.productName,
          qty: 0,
          revenue: 0,
        };
        cur.qty += item.quantity;
        cur.revenue += Number(item.lineTotal);
        productMap.set(item.sku, cur);
      }
    }
    const ranked = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);
    return {
      top: ranked.slice(0, 10),
      least: ranked.slice(-10).reverse(),
      hourly,
      channels: { online, pos },
    };
  }
}
