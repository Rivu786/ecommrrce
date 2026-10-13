import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

/**
 * Lightweight background jobs without hard Redis dependency at boot.
 * When Redis/BullMQ is available in production, these can be swapped to queues.
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  onModuleInit() {
    this.timers.push(setInterval(() => void this.releaseExpiredReservations(), 60_000));
    this.timers.push(setInterval(() => void this.flagAbandonedCarts(), 5 * 60_000));
    this.timers.push(setInterval(() => void this.processDueSubscriptions(), 15 * 60_000));
  }

  onModuleDestroy() {
    for (const t of this.timers) clearInterval(t);
  }

  private async releaseExpiredReservations() {
    try {
      if (typeof (this.inventory as any).releaseExpired === 'function') {
        await (this.inventory as any).releaseExpired();
        return;
      }
      const expired = await this.prisma.stockReservation.findMany({
        where: { releasedAt: null, expiresAt: { lte: new Date() } },
        take: 100,
      });
      for (const row of expired) {
        await this.prisma.$transaction(async (tx) => {
          await tx.stockReservation.update({
            where: { id: row.id },
            data: { releasedAt: new Date() },
          });
          const level = await tx.inventoryLevel.findUnique({
            where: {
              warehouseId_variantId: {
                warehouseId: row.warehouseId,
                variantId: row.variantId,
              },
            },
          });
          if (level) {
            await tx.inventoryLevel.update({
              where: { id: level.id },
              data: { reserved: Math.max(0, level.reserved - row.quantity) },
            });
          }
        });
      }
      if (expired.length) this.logger.log(`Released ${expired.length} expired stock reservations`);
    } catch (err) {
      this.logger.warn(`Reservation sweep failed: ${String(err)}`);
    }
  }

  private async flagAbandonedCarts() {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const carts = await this.prisma.cart.findMany({
        where: {
          updatedAt: { lte: cutoff },
          items: { some: {} },
        },
        take: 50,
        orderBy: { updatedAt: 'asc' },
      });
      for (const cart of carts) {
        const existing = await this.prisma.abandonedCartEvent.findFirst({
          where: { cartId: cart.id, createdAt: { gte: cutoff } },
        });
        if (existing) continue;
        await this.prisma.abandonedCartEvent.create({
          data: {
            tenantId: cart.tenantId,
            cartId: cart.id,
            channel: 'email',
            status: 'QUEUED',
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Abandoned cart sweep failed: ${String(err)}`);
    }
  }

  private async processDueSubscriptions() {
    try {
      const due = await this.prisma.subscription.findMany({
        where: { status: 'ACTIVE', nextBillingAt: { lte: new Date() } },
        take: 20,
        include: { plan: true },
      });
      for (const sub of due) {
        await this.prisma.subscriptionOrder.create({
          data: {
            subscriptionId: sub.id,
            cycleDate: new Date(),
            status: 'CREATED',
          },
        });
        const interval = sub.plan.interval;
        const next = new Date(sub.nextBillingAt);
        if (interval === 'DAILY') next.setDate(next.getDate() + 1);
        else if (interval === 'WEEKLY') next.setDate(next.getDate() + 7);
        else if (interval === 'YEARLY') next.setFullYear(next.getFullYear() + 1);
        else next.setMonth(next.getMonth() + 1);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { nextBillingAt: next },
        });
      }
      if (due.length) this.logger.log(`Queued ${due.length} subscription renewals`);
    } catch (err) {
      this.logger.warn(`Subscription sweep failed: ${String(err)}`);
    }
  }
}
