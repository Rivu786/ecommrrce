import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RoleCode } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  listCustomers(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        roles: { some: { role: { code: RoleCode.CUSTOMER } } },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listAddresses(tenantId: string, userId: string) {
    return this.prisma.address.findMany({
      where: { tenantId, userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(
    tenantId: string,
    userId: string,
    data: {
      label?: string;
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { tenantId, userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || 'IN',
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async updateAddress(tenantId: string, userId: string, id: string, data: Record<string, unknown>) {
    const addr = await this.prisma.address.findFirst({ where: { id, tenantId, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { tenantId, userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({
      where: { id },
      data: {
        label: data.label as string | undefined,
        fullName: data.fullName as string | undefined,
        phone: data.phone as string | undefined,
        line1: data.line1 as string | undefined,
        line2: data.line2 as string | undefined,
        city: data.city as string | undefined,
        state: data.state as string | undefined,
        postalCode: data.postalCode as string | undefined,
        country: data.country as string | undefined,
        isDefault: data.isDefault as boolean | undefined,
      },
    });
  }

  async deleteAddress(tenantId: string, userId: string, id: string) {
    const addr = await this.prisma.address.findFirst({ where: { id, tenantId, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id } });
    return { ok: true };
  }
}
