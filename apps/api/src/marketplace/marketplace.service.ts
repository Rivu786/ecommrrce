import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  listVendors(tenantId: string) {
    return this.prisma.vendor.findMany({
      where: { tenantId },
      include: { kyc: true, _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createVendor(
    tenantId: string,
    data: { name: string; slug: string; commissionPct?: number },
  ) {
    return this.prisma.vendor.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        slug: data.slug,
        commissionPct: data.commissionPct ?? 10,
        status: 'PENDING',
      },
    });
  }

  async updateVendor(tenantId: string, id: string, data: Record<string, unknown>) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({
      where: { id },
      data: {
        name: data.name as string | undefined,
        status: data.status as string | undefined,
        commissionPct: data.commissionPct as number | undefined,
      },
    });
  }

  async deleteVendor(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    await this.prisma.vendor.delete({ where: { id } });
    return { ok: true };
  }

  async submitKyc(tenantId: string, vendorId: string, documentsJson: object) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendorKyc.upsert({
      where: { vendorId },
      create: {
        id: randomUUID(),
        vendorId,
        documentsJson,
        status: 'PENDING',
      },
      update: { documentsJson, status: 'PENDING', reviewedAt: null },
    });
  }

  async reviewKyc(tenantId: string, vendorId: string, status: 'APPROVED' | 'REJECTED') {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, tenantId },
      include: { kyc: true },
    });
    if (!vendor?.kyc) throw new NotFoundException('KYC not found');
    await this.prisma.vendorKyc.update({
      where: { vendorId },
      data: { status, reviewedAt: new Date() },
    });
    if (status === 'APPROVED') {
      await this.prisma.vendor.update({
        where: { id: vendorId },
        data: { status: 'ACTIVE' },
      });
    }
    return this.prisma.vendor.findFirst({
      where: { id: vendorId },
      include: { kyc: true },
    });
  }

  listPayouts(tenantId: string, vendorId?: string) {
    return this.prisma.vendorPayout.findMany({
      where: {
        vendor: { tenantId },
        ...(vendorId ? { vendorId } : {}),
      },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayout(tenantId: string, vendorId: string, amount: number) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendorPayout.create({
      data: {
        id: randomUUID(),
        vendorId,
        amount,
        status: 'PAYABLE',
      },
    });
  }

  async markPayoutPaid(tenantId: string, payoutId: string) {
    const payout = await this.prisma.vendorPayout.findFirst({
      where: { id: payoutId, vendor: { tenantId } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    return this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
