import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  listWarehouses(tenantId: string) {
    return this.prisma.warehouse.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createWarehouse(
    tenantId: string,
    data: { name: string; code: string; addressJson?: object },
  ) {
    return this.prisma.warehouse.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        code: data.code,
        addressJson: data.addressJson,
      },
    });
  }

  async getLevels(tenantId: string, filters?: { warehouseId?: string; variantId?: string }) {
    return this.prisma.inventoryLevel.findMany({
      where: {
        tenantId,
        ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters?.variantId ? { variantId: filters.variantId } : {}),
      },
      include: { warehouse: true, variant: true },
    });
  }

  async adjust(
    tenantId: string,
    input: { warehouseId: string; variantId: string; delta: number; reason?: string },
  ) {
    const level = await this.prisma.inventoryLevel.findUnique({
      where: {
        warehouseId_variantId: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
        },
      },
    });

    const nextQty = (level?.quantity ?? 0) + input.delta;
    if (nextQty < 0) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Adjustment would make quantity negative',
      });
    }

    const updated = level
      ? await this.prisma.inventoryLevel.update({
          where: { id: level.id },
          data: { quantity: nextQty },
        })
      : await this.prisma.inventoryLevel.create({
          data: {
            id: randomUUID(),
            tenantId,
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            quantity: nextQty,
            reserved: 0,
          },
        });

    await this.prisma.stockAdjustment.create({
      data: {
        id: randomUUID(),
        tenantId,
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        delta: input.delta,
        reason: input.reason,
      },
    });

    return updated;
  }

  async transfer(
    tenantId: string,
    input: {
      fromWarehouseId: string;
      toWarehouseId: string;
      variantId: string;
      quantity: number;
    },
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException('Warehouses must differ');
    }

    return this.prisma.$transaction(async (tx) => {
      const from = await tx.inventoryLevel.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: input.fromWarehouseId,
            variantId: input.variantId,
          },
        },
      });
      const available = (from?.quantity ?? 0) - (from?.reserved ?? 0);
      if (available < input.quantity) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock to transfer',
        });
      }

      await tx.inventoryLevel.update({
        where: { id: from!.id },
        data: { quantity: { decrement: input.quantity } },
      });

      const to = await tx.inventoryLevel.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: input.toWarehouseId,
            variantId: input.variantId,
          },
        },
      });

      if (to) {
        await tx.inventoryLevel.update({
          where: { id: to.id },
          data: { quantity: { increment: input.quantity } },
        });
      } else {
        await tx.inventoryLevel.create({
          data: {
            id: randomUUID(),
            tenantId,
            warehouseId: input.toWarehouseId,
            variantId: input.variantId,
            quantity: input.quantity,
            reserved: 0,
          },
        });
      }

      return tx.stockTransfer.create({
        data: {
          id: randomUUID(),
          tenantId,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          variantId: input.variantId,
          quantity: input.quantity,
          status: 'COMPLETED',
        },
      });
    });
  }

  /** Reserve stock for cart/checkout. Returns reservation ids. */
  async reserve(
    tenantId: string,
    input: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      cartId?: string;
      orderId?: string;
      ttlMinutes?: number;
    },
  ) {
    const level = await this.prisma.inventoryLevel.findUnique({
      where: {
        warehouseId_variantId: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
        },
      },
    });
    const available = (level?.quantity ?? 0) - (level?.reserved ?? 0);
    if (!level || available < input.quantity) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock to reserve',
      });
    }

    const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 30) * 60_000);

    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { reserved: { increment: input.quantity } },
      });
      return tx.stockReservation.create({
        data: {
          id: randomUUID(),
          tenantId,
          warehouseId: input.warehouseId,
          variantId: input.variantId,
          cartId: input.cartId,
          orderId: input.orderId,
          quantity: input.quantity,
          expiresAt,
        },
      });
    });
  }

  /** Release reservation without consuming stock (cancel/reject). */
  async releaseReservations(tenantId: string, orderId: string) {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { tenantId, orderId, releasedAt: null },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const r of reservations) {
        await tx.inventoryLevel.updateMany({
          where: { warehouseId: r.warehouseId, variantId: r.variantId },
          data: { reserved: { decrement: r.quantity } },
        });
        await tx.stockReservation.update({
          where: { id: r.id },
          data: { releasedAt: new Date() },
        });
      }
    });
  }

  /** Convert reservation into a sale (decrement quantity + reserved). */
  async consumeReservationsAsSale(tenantId: string, orderId: string) {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { tenantId, orderId, releasedAt: null },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const r of reservations) {
        await tx.inventoryLevel.updateMany({
          where: { warehouseId: r.warehouseId, variantId: r.variantId },
          data: {
            quantity: { decrement: r.quantity },
            reserved: { decrement: r.quantity },
          },
        });
        await tx.stockReservation.update({
          where: { id: r.id },
          data: { releasedAt: new Date() },
        });
      }
    });
  }

  async defaultWarehouseId(tenantId: string): Promise<string> {
    const wh = await this.prisma.warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!wh) throw new NotFoundException('No warehouse configured');
    return wh.id;
  }

  async availabilityByVariant(tenantId: string, variantIds: string[]) {
    if (!variantIds.length) return [];
    const levels = await this.prisma.inventoryLevel.findMany({
      where: { tenantId, variantId: { in: variantIds } },
      include: { warehouse: true },
    });
    return levels.map((l) => ({
      variantId: l.variantId,
      warehouseId: l.warehouseId,
      warehouseCode: l.warehouse.code,
      warehouseName: l.warehouse.name,
      quantity: l.quantity,
      reserved: l.reserved,
      available: Math.max(0, l.quantity - l.reserved),
    }));
  }

  listPurchaseOrders(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createPurchaseOrder(
    tenantId: string,
    data: {
      warehouseId: string;
      vendorId?: string;
      items: Array<{ variantId: string; quantity: number; sku?: string }>;
      notes?: string;
    },
  ) {
    if (!data.items?.length) throw new BadRequestException('Items required');
    const number = `PO-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.purchaseOrder.create({
      data: {
        id: randomUUID(),
        tenantId,
        warehouseId: data.warehouseId,
        vendorId: data.vendorId,
        number,
        status: 'DRAFT',
        itemsJson: data.items,
        notes: data.notes,
      },
    });
  }

  async receivePurchaseOrder(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'RECEIVED') throw new BadRequestException('Already received');
    const items = (po.itemsJson as Array<{ variantId: string; quantity: number }>) || [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const level = await tx.inventoryLevel.findUnique({
          where: {
            warehouseId_variantId: {
              warehouseId: po.warehouseId,
              variantId: item.variantId,
            },
          },
        });
        if (level) {
          await tx.inventoryLevel.update({
            where: { id: level.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.inventoryLevel.create({
            data: {
              id: randomUUID(),
              tenantId,
              warehouseId: po.warehouseId,
              variantId: item.variantId,
              quantity: item.quantity,
              reserved: 0,
            },
          });
        }
        await tx.stockAdjustment.create({
          data: {
            id: randomUUID(),
            tenantId,
            warehouseId: po.warehouseId,
            variantId: item.variantId,
            delta: item.quantity,
            reason: `PO receive ${po.number}`,
          },
        });
      }
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      });
    });

    return this.prisma.purchaseOrder.findUnique({ where: { id } });
  }

  async restockOrderItems(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });
    if (!order) return;
    const warehouseId = await this.defaultWarehouseId(tenantId);
    for (const item of order.items) {
      if (!item.variantId) continue;
      await this.adjust(tenantId, {
        warehouseId,
        variantId: item.variantId,
        delta: item.quantity,
        reason: `Return restock ${order.orderNumber}`,
      });
    }
  }
}
