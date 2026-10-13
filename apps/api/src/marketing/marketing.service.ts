import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CouponType } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  listCoupons(tenantId: string) {
    return this.prisma.coupon.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(
    tenantId: string,
    data: {
      code: string;
      type: string;
      value: number;
      minCartTotal?: number;
      usageLimit?: number;
      perUserLimit?: number;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    return this.prisma.coupon.create({
      data: {
        id: randomUUID(),
        tenantId,
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minCartTotal: data.minCartTotal,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });
  }

  async updateCoupon(tenantId: string, id: string, data: Record<string, unknown>) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.coupon.update({
      where: { id },
      data: {
        type: data.type as string | undefined,
        value: data.value as number | undefined,
        minCartTotal: data.minCartTotal as number | undefined,
        usageLimit: data.usageLimit as number | undefined,
        isActive: data.isActive as boolean | undefined,
        startsAt: data.startsAt ? new Date(data.startsAt as string) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt as string) : undefined,
      },
    });
  }

  async deleteCoupon(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  async validateCoupon(tenantId: string, code: string, cartSubtotal: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { tenantId, code: code.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new BadRequestException('Invalid coupon');
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('Coupon not started');
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestException('Coupon expired');
    if (coupon.minCartTotal && cartSubtotal < Number(coupon.minCartTotal)) {
      throw new BadRequestException('Cart total below coupon minimum');
    }
    if (coupon.usageLimit != null) {
      const used = await this.prisma.couponRedemption.count({ where: { couponId: coupon.id } });
      if (used >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    }
    return coupon;
  }

  computeDiscount(coupon: { type: string; value: unknown }, subtotal: number): number {
    const value = Number(coupon.value);
    if (coupon.type === CouponType.PERCENTAGE) {
      return Math.min(subtotal, (subtotal * value) / 100);
    }
    if (coupon.type === CouponType.FIXED) {
      return Math.min(subtotal, value);
    }
    if (coupon.type === CouponType.FREE_SHIPPING) {
      return 0;
    }
    return 0;
  }

  listGiftCards(tenantId: string) {
    return this.prisma.giftCard.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createGiftCard(
    tenantId: string,
    data: { code?: string; amount: number; expiresAt?: string },
  ) {
    const code = (data.code || randomUUID().slice(0, 12)).toUpperCase();
    return this.prisma.giftCard.create({
      data: {
        id: randomUUID(),
        tenantId,
        code,
        initialAmount: data.amount,
        balance: data.amount,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async earnLoyalty(tenantId: string, userId: string, points: number, reason?: string, orderId?: string) {
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { id: randomUUID(), tenantId, userId, points },
      update: { points: { increment: points } },
    });
    await this.prisma.loyaltyTransaction.create({
      data: {
        id: randomUUID(),
        accountId: account.id,
        points,
        reason,
        orderId,
      },
    });
    return account;
  }

  async redeemLoyalty(tenantId: string, userId: string, points: number, reason?: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({ where: { userId, tenantId } });
    if (!account || account.points < points) {
      throw new BadRequestException('Insufficient loyalty points');
    }
    const updated = await this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { decrement: points } },
    });
    await this.prisma.loyaltyTransaction.create({
      data: {
        id: randomUUID(),
        accountId: account.id,
        points: -points,
        reason,
      },
    });
    return updated;
  }
}
