import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SubscriptionInterval, SubscriptionStatus } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans(tenantId: string) {
    return this.prisma.subscriptionPlan.findMany({
      where: { tenantId, isActive: true },
      include: { product: true },
    });
  }

  createPlan(
    tenantId: string,
    data: {
      productId: string;
      name: string;
      interval: string;
      price: number;
    },
  ) {
    return this.prisma.subscriptionPlan.create({
      data: {
        id: randomUUID(),
        tenantId,
        productId: data.productId,
        name: data.name,
        interval: data.interval,
        price: data.price,
      },
    });
  }

  private nextBillingDate(interval: string, from = new Date()): Date {
    const d = new Date(from);
    switch (interval) {
      case SubscriptionInterval.DAILY:
        d.setDate(d.getDate() + 1);
        break;
      case SubscriptionInterval.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case SubscriptionInterval.YEARLY:
        d.setFullYear(d.getFullYear() + 1);
        break;
      case SubscriptionInterval.MONTHLY:
      default:
        d.setMonth(d.getMonth() + 1);
        break;
    }
    return d;
  }

  async subscribe(tenantId: string, userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: planId, tenantId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.subscription.create({
      data: {
        id: randomUUID(),
        tenantId,
        planId,
        userId,
        status: SubscriptionStatus.ACTIVE,
        nextBillingAt: this.nextBillingDate(plan.interval),
      },
      include: { plan: true },
    });
  }

  async pause(tenantId: string, userId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId, userId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
    });
  }

  async cancel(tenantId: string, userId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, tenantId, userId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  listMine(tenantId: string, userId: string) {
    return this.prisma.subscription.findMany({
      where: { tenantId, userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Helper used by cron/workers to find subscriptions due for billing. */
  listDueSubscriptions(tenantId?: string, asOf = new Date()) {
    return this.prisma.subscription.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: SubscriptionStatus.ACTIVE,
        nextBillingAt: { lte: asOf },
      },
      include: { plan: true },
    });
  }

  async advanceBilling(subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Subscription not active');
    }
    const next = this.nextBillingDate(sub.plan.interval, sub.nextBillingAt);
    await this.prisma.subscriptionOrder.create({
      data: {
        id: randomUUID(),
        subscriptionId: sub.id,
        cycleDate: sub.nextBillingAt,
        status: 'CREATED',
      },
    });
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingAt: next },
    });
  }
}
