import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MarketingService } from '../marketing/marketing.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketing: MarketingService,
  ) {}

  async getOrCreate(
    tenantId: string,
    opts: { userId?: string; sessionId?: string; currencyCode?: string },
  ): Promise<any> {
    if (!opts.userId && !opts.sessionId) {
      throw new BadRequestException('userId or sessionId required');
    }

    if (opts.userId && opts.sessionId) {
      return this.mergeGuestCart(tenantId, opts.userId, opts.sessionId);
    }

    let cart = opts.userId
      ? await this.prisma.cart.findFirst({
          where: { tenantId, userId: opts.userId },
          include: this.cartInclude(),
        })
      : await this.prisma.cart.findFirst({
          where: { tenantId, sessionId: opts.sessionId! },
          include: this.cartInclude(),
        });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          id: randomUUID(),
          tenantId,
          userId: opts.userId,
          sessionId: opts.sessionId,
          currencyCode: opts.currencyCode || 'INR',
        },
        include: this.cartInclude(),
      });
    }

    return this.serializeCart(cart);
  }

  async getById(tenantId: string, cartId: string): Promise<any> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId },
      include: this.cartInclude(),
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.serializeCart(cart);
  }

  async addItem(
    tenantId: string,
    cartId: string,
    input: { variantId: string; quantity: number; addonsJson?: object; notes?: string },
  ) {
    const cart = await this.prisma.cart.findFirst({ where: { id: cartId, tenantId } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (input.quantity < 1) throw new BadRequestException('Quantity must be >= 1');

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: input.variantId, tenantId },
      include: { product: true },
    });
    if (!variant || !variant.isActive) throw new NotFoundException('Variant not found');
    if (variant.product.specialInstructionsRequired && !input.notes?.trim()) {
      throw new BadRequestException('Special instructions required');
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: input.variantId } },
      create: {
        id: randomUUID(),
        cartId,
        variantId: input.variantId,
        quantity: input.quantity,
        addonsJson: input.addonsJson,
        notes: input.notes,
      },
      update: {
        quantity: { increment: input.quantity },
        addonsJson: input.addonsJson,
        notes: input.notes,
      },
    });

    return this.getById(tenantId, cartId);
  }

  async updateItem(
    tenantId: string,
    cartId: string,
    itemId: string,
    input: { quantity?: number; notes?: string },
  ) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { id: cartId, tenantId } },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    if (input.quantity !== undefined && input.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity: input.quantity,
          notes: input.notes,
        },
      });
    }
    return this.getById(tenantId, cartId);
  }

  async removeItem(tenantId: string, cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { id: cartId, tenantId } },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getById(tenantId, cartId);
  }

  async applyCoupon(tenantId: string, cartId: string, code: string) {
    const cart = await this.getById(tenantId, cartId);
    await this.marketing.validateCoupon(tenantId, code, cart.subtotal);
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: code.toUpperCase() },
    });
    return this.getById(tenantId, cartId);
  }

  async mergeGuestCart(tenantId: string, userId: string, sessionId: string): Promise<any> {
    const guest = await this.prisma.cart.findFirst({
      where: { tenantId, sessionId },
      include: { items: true },
    });
    if (!guest) return this.getOrCreate(tenantId, { userId });

    let userCart = await this.prisma.cart.findFirst({
      where: { tenantId, userId },
      include: { items: true },
    });
    if (!userCart) {
      await this.prisma.cart.update({
        where: { id: guest.id },
        data: { userId, sessionId: null },
      });
      return this.getById(tenantId, guest.id);
    }

    for (const item of guest.items) {
      await this.prisma.cartItem.upsert({
        where: {
          cartId_variantId: { cartId: userCart.id, variantId: item.variantId },
        },
        create: {
          id: randomUUID(),
          cartId: userCart.id,
          variantId: item.variantId,
          quantity: item.quantity,
          addonsJson: item.addonsJson ?? undefined,
          notes: item.notes,
        },
        update: { quantity: { increment: item.quantity } },
      });
    }

    await this.prisma.cart.delete({ where: { id: guest.id } });
    return this.getById(tenantId, userCart.id);
  }

  private cartInclude() {
    return {
      items: {
        include: {
          variant: {
            include: {
              product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' as const } } } },
            },
          },
        },
      },
    };
  }

  private serializeCart(cart: any) {
    const items = (cart.items || []).map((item: any) => {
      const unitPrice = Number(item.variant.price);
      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        notes: item.notes,
        addonsJson: item.addonsJson,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          name: item.variant.name,
          price: unitPrice,
          product: item.variant.product
            ? {
                id: item.variant.product.id,
                name: item.variant.product.name,
                slug: item.variant.product.slug,
                image: item.variant.product.images?.[0]?.url ?? null,
              }
            : null,
        },
      };
    });
    const subtotal = items.reduce((s: number, i: any) => s + i.lineTotal, 0);
    return {
      id: cart.id,
      tenantId: cart.tenantId,
      userId: cart.userId,
      sessionId: cart.sessionId,
      currencyCode: cart.currencyCode,
      couponCode: cart.couponCode,
      shippingMethod: cart.shippingMethod,
      items,
      subtotal,
      itemCount: items.reduce((s: number, i: any) => s + i.quantity, 0),
    };
  }
}
