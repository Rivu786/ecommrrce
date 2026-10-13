import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId?: string, guestUuid?: string) {
    return this.prisma.wishlist.findMany({
      where: {
        tenantId,
        ...(userId ? { userId } : { guestUuid }),
      },
      include: { items: true },
    });
  }

  async create(
    tenantId: string,
    data: { userId?: string; guestUuid?: string; name?: string },
  ) {
    return this.prisma.wishlist.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId: data.userId,
        guestUuid: data.guestUuid,
        name: data.name || 'Default',
        shareToken: randomUUID(),
      },
      include: { items: true },
    });
  }

  async addItem(
    tenantId: string,
    wishlistId: string,
    data: { productId: string; notes?: string; priceAlert?: boolean },
  ) {
    const list = await this.prisma.wishlist.findFirst({ where: { id: wishlistId, tenantId } });
    if (!list) throw new NotFoundException('Wishlist not found');
    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId, productId: data.productId } },
      create: {
        id: randomUUID(),
        wishlistId,
        productId: data.productId,
        notes: data.notes,
        priceAlert: data.priceAlert ?? false,
      },
      update: { notes: data.notes, priceAlert: data.priceAlert },
    });
    return this.prisma.wishlist.findFirst({
      where: { id: wishlistId },
      include: { items: true },
    });
  }

  async removeItem(tenantId: string, wishlistId: string, itemId: string) {
    const list = await this.prisma.wishlist.findFirst({ where: { id: wishlistId, tenantId } });
    if (!list) throw new NotFoundException('Wishlist not found');
    await this.prisma.wishlistItem.deleteMany({ where: { id: itemId, wishlistId } });
    return { ok: true };
  }

  async delete(tenantId: string, id: string) {
    const list = await this.prisma.wishlist.findFirst({ where: { id, tenantId } });
    if (!list) throw new NotFoundException('Wishlist not found');
    await this.prisma.wishlist.delete({ where: { id } });
    return { ok: true };
  }
}
