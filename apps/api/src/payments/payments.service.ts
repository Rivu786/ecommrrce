import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderStatus, PaymentStatus } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { MarketingService } from '../marketing/marketing.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly marketing: MarketingService,
    private readonly webhooks: WebhooksService,
    private readonly audit: AuditService,
  ) {}

  async verifySubmit(
    tenantId: string,
    input: {
      orderPaymentReference: string;
      utr: string;
      payerBankName?: string;
      senderAccount?: string;
      screenshotUrl?: string;
    },
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { tenantId, orderPaymentReference: input.orderPaymentReference },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.REJECTED
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_INVALID_STATE',
        message: `Cannot submit payment in status ${payment.status}`,
      });
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUBMITTED,
        utr: input.utr,
        payerBankName: input.payerBankName,
        senderAccount: input.senderAccount,
        screenshotUrl: input.screenshotUrl,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAYMENT_SUBMITTED },
    });

    void this.webhooks.emitWebhook(tenantId, 'payment.submitted', {
      paymentId: payment.id,
      orderId: payment.orderId,
      utr: input.utr,
    });

    return updated;
  }

  listPending(tenantId: string) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        status: { in: [PaymentStatus.SUBMITTED, PaymentStatus.VERIFICATION_IN_PROGRESS] },
      },
      include: { order: { include: { items: true, user: true } } },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async confirm(tenantId: string, paymentId: string, verifiedById: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (
      payment.status !== PaymentStatus.SUBMITTED &&
      payment.status !== PaymentStatus.VERIFICATION_IN_PROGRESS
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_INVALID_STATE',
        message: `Cannot confirm payment in status ${payment.status}`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          verifiedAt: new Date(),
          verifiedById,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });
      const invoiceNumber = `INV-${payment.order.orderNumber}`;
      await tx.invoice.create({
        data: {
          id: randomUUID(),
          tenantId,
          orderId: payment.orderId,
          number: invoiceNumber,
        },
      });
      if (payment.order.couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: { tenantId, code: payment.order.couponCode },
        });
        if (coupon) {
          await tx.couponRedemption.create({
            data: {
              id: randomUUID(),
              couponId: coupon.id,
              userId: payment.order.userId,
              orderId: payment.orderId,
            },
          });
        }
      }
    });

    await this.inventory.consumeReservationsAsSale(tenantId, payment.orderId);

    if (payment.order.userId) {
      const points = Math.floor(Number(payment.amount));
      if (points > 0) {
        await this.marketing.earnLoyalty(
          tenantId,
          payment.order.userId,
          points,
          'order_confirmed',
          payment.orderId,
        );
      }
    }

    await this.audit.log({
      tenantId,
      actorId: verifiedById,
      action: 'payment.confirm',
      entityType: 'Payment',
      entityId: paymentId,
    });

    void this.webhooks.emitWebhook(tenantId, 'payment.confirmed', {
      paymentId,
      orderId: payment.orderId,
    });

    if (payment.order.fulfillmentMode === 'HOME_DELIVERY') {
      await this.prisma.deliveryJob
        .create({
          data: {
            id: randomUUID(),
            tenantId,
            orderId: payment.orderId,
            status: 'UNASSIGNED',
          },
        })
        .catch(() => undefined);
    }

    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { invoice: true } } },
    });
  }

  async reject(tenantId: string, paymentId: string, verifiedById: string, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (
      payment.status !== PaymentStatus.SUBMITTED &&
      payment.status !== PaymentStatus.VERIFICATION_IN_PROGRESS &&
      payment.status !== PaymentStatus.PENDING
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_INVALID_STATE',
        message: `Cannot reject payment in status ${payment.status}`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REJECTED,
          verifiedAt: new Date(),
          verifiedById,
          rejectionReason: reason || 'Rejected by admin',
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    await this.inventory.releaseReservations(tenantId, payment.orderId);

    await this.audit.log({
      tenantId,
      actorId: verifiedById,
      action: 'payment.reject',
      entityType: 'Payment',
      entityId: paymentId,
      meta: { reason },
    });

    void this.webhooks.emitWebhook(tenantId, 'payment.rejected', {
      paymentId,
      orderId: payment.orderId,
      reason,
    });

    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }
}
