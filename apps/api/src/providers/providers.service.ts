import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  listProviders(tenantId: string) {
    return this.prisma.serviceProvider.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  createProvider(
    tenantId: string,
    data: { name: string; email?: string; phone?: string; category: string; notes?: string },
  ) {
    return this.prisma.serviceProvider.create({
      data: { id: randomUUID(), tenantId, ...data },
    });
  }

  listRequirements(tenantId: string) {
    return this.prisma.requirement.findMany({
      where: { tenantId },
      include: { serviceProvider: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createRequirement(
    tenantId: string,
    data: {
      title: string;
      itemsJson: object;
      dueDate?: string;
      vendorId?: string;
      serviceProviderId?: string;
    },
  ) {
    return this.prisma.requirement.create({
      data: {
        id: randomUUID(),
        tenantId,
        title: data.title,
        itemsJson: data.itemsJson,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        vendorId: data.vendorId,
        serviceProviderId: data.serviceProviderId,
        status: 'DRAFT',
      },
    });
  }

  async sendRequirement(tenantId: string, id: string) {
    const row = await this.prisma.requirement.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Requirement not found');
    return this.prisma.requirement.update({ where: { id }, data: { status: 'SENT' } });
  }

  async setStatus(tenantId: string, id: string, status: string) {
    const row = await this.prisma.requirement.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Requirement not found');
    return this.prisma.requirement.update({ where: { id }, data: { status } });
  }
}
