import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@omnicommerce/shared';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPaid(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { payment: true, items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const st = order.payment?.status;
    if (st !== PaymentStatus.CONFIRMED && st !== PaymentStatus.PAID_CASH) {
      throw new BadRequestException('Order not paid');
    }
    return order;
  }

  async createInvoice(tenantId: string, orderId: string) {
    const order = await this.assertPaid(tenantId, orderId);
    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return existing;
    const number = `INV-${order.orderNumber}`;
    const pdfUrl = await this.renderPdf(tenantId, order, 'INVOICE', number);
    return this.prisma.invoice.create({
      data: { id: randomUUID(), tenantId, orderId, number, pdfUrl },
    });
  }

  async createReceipt(tenantId: string, orderId: string) {
    const order = await this.assertPaid(tenantId, orderId);
    const existing = await this.prisma.receipt.findUnique({ where: { orderId } });
    if (existing) return existing;
    const number = `RCT-${order.orderNumber}`;
    const pdfUrl = await this.renderPdf(tenantId, order, 'RECEIPT', number);
    return this.prisma.receipt.create({
      data: { id: randomUUID(), tenantId, orderId, number, pdfUrl },
    });
  }

  private async renderPdf(tenantId: string, order: any, kind: 'INVOICE' | 'RECEIPT', number: string) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${kind.toLowerCase()}-${number}.pdf`;
    const localPath = join(uploadsDir, filename);

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));
    doc.fontSize(16).text(settings?.bankBeneficiaryName || 'Store', { continued: false });
    doc.fontSize(10).text(`GSTIN: ${settings?.gstin || '-'}`);
    doc.text(`Support: ${settings?.supportPhone || '-'}`);
    doc.text(settings?.legalAddress || '');
    doc.moveDown();
    doc.fontSize(14).text(kind);
    doc.fontSize(10).text(number);
    doc.text(`Order: ${order.orderNumber}`);
    doc.moveDown();
    for (const item of order.items || []) {
      doc.text(`${item.productName}  x${item.quantity}  ${item.lineTotal}`);
    }
    doc.moveDown();
    doc.text(`Total: ${order.grandTotal} ${order.currencyCode}`);
    doc.end();
    await done;
    await writeFile(localPath, Buffer.concat(chunks));
    return `/uploads/${filename}`;
  }
}
