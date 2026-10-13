import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderStatus, PaymentStatus } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';

type QuoteItem = {
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

@Injectable()
export class B2bService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
  ) {}

  listCompanies(tenantId: string) {
    return this.prisma.company.findMany({
      where: { tenantId },
      include: { users: true, quotes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCompany(tenantId: string, data: { name: string; creditLimit?: number }) {
    return this.prisma.company.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        creditLimit: data.creditLimit ?? 0,
      },
    });
  }

  async addCompanyUser(tenantId: string, companyId: string, userId: string, role = 'BUYER') {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    return this.prisma.companyUser.create({
      data: { companyId, userId, role },
    });
  }

  listQuotes(tenantId: string, companyId?: string) {
    return this.prisma.quote.findMany({
      where: { tenantId, ...(companyId ? { companyId } : {}) },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuote(
    tenantId: string,
    data: {
      companyId: string;
      items: QuoteItem[];
      validUntil?: string;
    },
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');
    const total = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return this.prisma.quote.create({
      data: {
        id: randomUUID(),
        tenantId,
        companyId: data.companyId,
        status: 'SENT',
        itemsJson: data.items,
        total,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });
  }

  async acceptQuote(tenantId: string, quoteId: string, userId?: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status === 'ACCEPTED') throw new BadRequestException('Quote already accepted');
    if (quote.validUntil && quote.validUntil < new Date()) {
      throw new BadRequestException('Quote expired');
    }

    const items = quote.itemsJson as QuoteItem[];
    if (!Array.isArray(items) || !items.length) {
      throw new BadRequestException('Quote has no items');
    }

    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const orderNumber = `B2B-${Date.now().toString(36).toUpperCase()}`;
    const orderPaymentReference = `PAY-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const grandTotal = Number(quote.total);

    let qrPayload: string | undefined;
    let qrCodeUrl: string | undefined;
    if (settings?.upiId) {
      const qr = await this.qr.generateUpiQr({
        pa: settings.upiId,
        am: grandTotal.toFixed(2),
        tn: orderPaymentReference,
        pn: settings.bankBeneficiaryName || undefined,
      });
      qrPayload = qr.qrPayload;
      qrCodeUrl = qr.qrCodeUrl;
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: randomUUID(),
          tenantId,
          userId,
          orderNumber,
          status: OrderStatus.PENDING_PAYMENT,
          currencyCode: settings?.currencyCode || 'INR',
          subtotal: grandTotal,
          discountTotal: 0,
          taxTotal: 0,
          shippingTotal: 0,
          grandTotal,
          quoteId: quote.id,
          items: {
            create: items.map((i) => ({
              id: randomUUID(),
              variantId: i.variantId,
              productName: i.productName,
              sku: i.sku,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.unitPrice * i.quantity,
            })),
          },
          payment: {
            create: {
              id: randomUUID(),
              tenantId,
              status: PaymentStatus.PENDING,
              amount: grandTotal,
              currencyCode: settings?.currencyCode || 'INR',
              orderPaymentReference,
              qrPayload,
              qrCodeUrl,
            },
          },
        },
        include: { items: true, payment: true },
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'ACCEPTED' },
      });

      return created;
    });

    return order;
  }
}
