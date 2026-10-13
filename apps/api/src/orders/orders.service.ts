import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderStatus, PaymentStatus, FulfillmentMode } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { MarketingService } from '../marketing/marketing.service';
import { QrService } from '../qr/qr.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly inventory: InventoryService,
    private readonly marketing: MarketingService,
    private readonly qr: QrService,
    private readonly webhooks: WebhooksService,
  ) {}

  async checkout(
    tenantId: string,
    input: {
      cartId: string;
      userId?: string;
      fulfillmentMode?: string;
      shippingAddressJson?: object;
      guestJson?: object;
      notes?: string;
      tableNumber?: string;
      paymentMethod?: string;
      channel?: string;
      soldByStaffId?: string;
      shippingMethod?: string;
    },
  ) {
    const cart = await this.cart.getById(tenantId, input.cartId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const payMethod = input.paymentMethod === 'CASH' ? 'CASH' : 'QR_UTR';
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (payMethod === 'QR_UTR' && !settings?.upiId) {
      throw new BadRequestException('Tenant UPI ID not configured');
    }

    if (input.shippingMethod) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { shippingMethod: input.shippingMethod },
      });
      cart.shippingMethod = input.shippingMethod;
    }

    let discountTotal = 0;
    let freeShipping = false;
    if (cart.couponCode) {
      const coupon = await this.marketing.validateCoupon(tenantId, cart.couponCode, cart.subtotal);
      discountTotal = this.marketing.computeDiscount(coupon, cart.subtotal);
      freeShipping = (coupon as { type?: string }).type === 'FREE_SHIPPING';
    }

    const address = (input.shippingAddressJson || {}) as { country?: string };
    const shippingTotal = freeShipping
      ? 0
      : await this.resolveShipping(
          tenantId,
          cart.subtotal - discountTotal,
          cart.shippingMethod || undefined,
          address.country,
        );
    const taxable = Math.max(0, cart.subtotal - discountTotal);
    const taxTotal = this.computeTax(settings, taxable);
    const grandTotal = Math.max(0, cart.subtotal - discountTotal + shippingTotal + taxTotal);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const orderPaymentReference = `PAY-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const warehouseId = await this.inventory.defaultWarehouseId(tenantId);

    const { qrPayload, qrCodeUrl } =
      payMethod === 'QR_UTR'
        ? await this.qr.generateUpiQr({
            pa: settings!.upiId!,
            am: grandTotal.toFixed(2),
            tn: orderPaymentReference,
            pn: settings?.bankBeneficiaryName || undefined,
          })
        : { qrPayload: null as string | null, qrCodeUrl: null as string | null };

    const orderId = randomUUID();

    for (const item of cart.items) {
      await this.inventory.reserve(tenantId, {
        warehouseId,
        variantId: item.variantId,
        quantity: item.quantity,
        orderId,
        cartId: cart.id,
      });
    }

    let order;
    try {
      order = await this.prisma.order.create({
        data: {
          id: orderId,
          tenantId,
          userId: input.userId || cart.userId,
          orderNumber,
          status: payMethod === 'CASH' ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
          fulfillmentMode: input.fulfillmentMode || FulfillmentMode.HOME_DELIVERY,
          currencyCode: cart.currencyCode,
          subtotal: cart.subtotal,
          discountTotal,
          taxTotal,
          shippingTotal,
          grandTotal,
          guestJson: input.guestJson,
          shippingAddressJson: input.shippingAddressJson,
          notes: input.notes,
          tableNumber: input.tableNumber,
          couponCode: cart.couponCode,
          channel: input.channel || 'ONLINE',
          soldByStaffId: input.soldByStaffId,
          items: {
            create: cart.items.map((item: any) => ({
              id: randomUUID(),
              variantId: item.variantId,
              productName: item.variant.product?.name || item.variant.name || item.variant.sku,
              sku: item.variant.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              addonsJson: item.addonsJson,
            })),
          },
          payment: {
            create: {
              id: randomUUID(),
              tenantId,
              status: payMethod === 'CASH' ? PaymentStatus.PAID_CASH : PaymentStatus.PENDING,
              method: payMethod,
              amount: grandTotal,
              currencyCode: cart.currencyCode,
              orderPaymentReference,
              qrPayload,
              qrCodeUrl,
            },
          },
        },
        include: { items: true, payment: true },
      });
    } catch (err) {
      await this.inventory.releaseReservations(tenantId, orderId);
      throw err;
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null },
    });

    if (payMethod === 'CASH') {
      await this.inventory.consumeReservationsAsSale(tenantId, orderId);
    }
    if (
      (payMethod === 'CASH' || order.status === OrderStatus.CONFIRMED) &&
      (input.fulfillmentMode || FulfillmentMode.HOME_DELIVERY) === FulfillmentMode.HOME_DELIVERY
    ) {
      await this.prisma.deliveryJob.create({
        data: { id: randomUUID(), tenantId, orderId: order.id, status: 'UNASSIGNED' },
      }).catch(() => undefined);
    }

    void this.webhooks.emitWebhook(tenantId, 'order.created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

    return {
      ...order,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      taxTotal: Number(order.taxTotal),
      shippingTotal: Number(order.shippingTotal),
      grandTotal: Number(order.grandTotal),
      payment: order.payment
        ? {
            ...order.payment,
            amount: Number(order.payment.amount),
          }
        : null,
    };
  }

  async getOrder(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { items: true, payment: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async listOrders(tenantId: string, filters?: { userId?: string; status?: string }) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        ...(filters?.userId ? { userId: filters.userId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { payment: true, items: true },
      take: 100,
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { payment: true, items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = new Set(Object.values(OrderStatus));
    if (!allowed.has(status as OrderStatus)) {
      throw new BadRequestException(`Invalid status ${status}`);
    }

    const paid =
      order.payment?.status === PaymentStatus.CONFIRMED ||
      order.payment?.status === PaymentStatus.PAID_CASH;

    if (
      [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.PARTIALLY_SHIPPED, OrderStatus.DELIVERED].includes(
        status as OrderStatus,
      ) &&
      !paid &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException('Order must be paid before fulfillment');
    }

    if (status === OrderStatus.CANCELLED) {
      if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.RETURNED].includes(order.status as OrderStatus)) {
        throw new BadRequestException('Cannot cancel shipped/delivered order');
      }
      await this.inventory.releaseReservations(tenantId, id);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, payment: true, invoice: true },
    });

    if (status === OrderStatus.PROCESSING || status === OrderStatus.SHIPPED) {
      await this.prisma.deliveryJob
        .create({
          data: { id: randomUUID(), tenantId, orderId: id, status: 'UNASSIGNED' },
        })
        .catch(() => undefined);
    }

    void this.webhooks.emitWebhook(tenantId, 'order.status_changed', {
      orderId: id,
      status,
    });

    return updated;
  }

  computeTax(settings: { taxRulesJson?: unknown } | null, taxable: number): number {
    const rules = (settings?.taxRulesJson || {}) as { ratePct?: number; inclusive?: boolean };
    const rate = Number(rules.ratePct ?? 0);
    if (!rate || rules.inclusive) return 0;
    return Math.round(taxable * (rate / 100) * 100) / 100;
  }

  async resolveShipping(
    tenantId: string,
    subtotal: number,
    methodCode?: string,
    country?: string,
  ): Promise<number> {
    if (!methodCode) return 0;
    const zones = await this.prisma.shippingZone.findMany({
      where: { tenantId, isActive: true },
      include: { rates: true },
    });
    for (const zone of zones) {
      const countries = (zone.countries as string[] | null) || [];
      if (country && countries.length && !countries.includes(country)) continue;
      const rate = zone.rates.find((r) => r.methodCode === methodCode);
      if (!rate) continue;
      if (rate.minOrderTotal != null && subtotal < Number(rate.minOrderTotal)) continue;
      return Number(rate.price);
    }
    return 0;
  }
}
