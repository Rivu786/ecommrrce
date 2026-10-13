import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReturnStatus } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    input: { orderId: string; reason: string; imagesJson?: object },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, tenantId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.returnRequest.create({
      data: {
        id: randomUUID(),
        tenantId,
        orderId: input.orderId,
        reason: input.reason,
        imagesJson: input.imagesJson,
        status: ReturnStatus.REQUESTED,
      },
    });
  }

  list(tenantId: string, status?: string) {
    return this.prisma.returnRequest.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { order: true, refund: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(tenantId: string, id: string, adminNote?: string, restock = true) {
    const req = await this.prisma.returnRequest.findFirst({
      where: { id, tenantId },
      include: { order: true },
    });
    if (!req) throw new NotFoundException('Return not found');
    if (req.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException('Return not in REQUESTED state');
    }

    const amount = Number(req.order.grandTotal);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.returnRequest.update({
        where: { id },
        data: {
          status: ReturnStatus.REFUNDED,
          adminNote,
        },
      });

      await tx.refund.create({
        data: {
          id: randomUUID(),
          tenantId,
          returnRequestId: id,
          amount,
          method: 'STORE_CREDIT',
        },
      });

      if (req.order.userId) {
        await tx.storeCredit.upsert({
          where: {
            tenantId_userId: { tenantId, userId: req.order.userId },
          },
          create: {
            id: randomUUID(),
            tenantId,
            userId: req.order.userId,
            balance: amount,
          },
          update: { balance: { increment: amount } },
        });
      }

      await tx.order.update({
        where: { id: req.orderId },
        data: { status: 'RETURNED' },
      });

      return row;
    });

    if (restock) {
      await this.inventory.restockOrderItems(tenantId, req.orderId);
    }

    return updated;
  }

  async reject(tenantId: string, id: string, adminNote?: string) {
    const req = await this.prisma.returnRequest.findFirst({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('Return not found');
    if (req.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException('Return not in REQUESTED state');
    }
    return this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.REJECTED, adminNote },
    });
  }
}
