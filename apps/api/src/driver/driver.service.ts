import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DeliveryJobStatus } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDriver(tenantId: string, userId: string) {
    let driver = await this.prisma.driver.findFirst({ where: { tenantId, userId } });
    if (!driver) {
      driver = await this.prisma.driver.create({
        data: { id: randomUUID(), tenantId, userId },
      });
    }
    return driver;
  }

  async setOnline(tenantId: string, userId: string, isOnline: boolean) {
    const driver = await this.ensureDriver(tenantId, userId);
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { isOnline },
    });
  }

  async updateLocation(tenantId: string, userId: string, lat: number, lng: number) {
    const driver = await this.ensureDriver(tenantId, userId);
    await this.prisma.driverLocation.create({
      data: {
        id: randomUUID(),
        driverId: driver.id,
        lat,
        lng,
      },
    });
    return { ok: true };
  }

  async listJobs(tenantId: string, userId: string, status?: string, lat?: number, lng?: number) {
    const driver = await this.ensureDriver(tenantId, userId);
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const radius = Number(settings?.deliveryRadiusKm ?? 15);
    const lastLoc = await this.prisma.driverLocation.findFirst({
      where: { driverId: driver.id },
      orderBy: { recordedAt: 'desc' },
    });
    const dlat = lat ?? (lastLoc ? Number(lastLoc.lat) : undefined);
    const dlng = lng ?? (lastLoc ? Number(lastLoc.lng) : undefined);

    const jobs = await this.prisma.deliveryJob.findMany({
      where: {
        tenantId,
        OR: [
          { driverId: driver.id },
          { status: DeliveryJobStatus.UNASSIGNED, driverId: null },
        ],
        ...(status ? { status } : {}),
      },
      include: { order: { include: { items: true, payment: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const withDist = jobs.map((j) => {
      const addr = (j.order?.shippingAddressJson || {}) as { lat?: number; lng?: number };
      const jlat = Number(addr.lat);
      const jlng = Number(addr.lng);
      let distanceKm: number | null = null;
      if (dlat != null && dlng != null && Number.isFinite(jlat) && Number.isFinite(jlng)) {
        distanceKm = this.haversine(dlat, dlng, jlat, jlng);
      }
      return { ...j, distanceKm };
    });

    return withDist
      .filter((j) => {
        if (j.driverId === driver.id) return true;
        if (j.distanceKm == null) return true;
        return j.distanceKm <= radius;
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async acceptJob(tenantId: string, userId: string, jobId: string) {
    const driver = await this.ensureDriver(tenantId, userId);
    if (!driver.isOnline) throw new ForbiddenException('Go online to accept jobs');
    const job = await this.prisma.deliveryJob.findFirst({
      where: { id: jobId, tenantId, status: DeliveryJobStatus.UNASSIGNED },
      include: { order: { include: { payment: true } } },
    });
    if (!job) throw new NotFoundException('Job not available');
    const pay = job.order.payment?.status;
    if (pay !== 'CONFIRMED' && pay !== 'PAID_CASH') {
      throw new ForbiddenException('Order not paid — dispatch blocked');
    }
    return this.prisma.deliveryJob.update({
      where: { id: jobId },
      data: {
        driverId: driver.id,
        status: DeliveryJobStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  async advanceJob(
    tenantId: string,
    userId: string,
    jobId: string,
    next: 'ARRIVED' | 'PICKED_UP' | 'DELIVERED',
    extras?: { pickupPhotoUrl?: string; podPhotoUrl?: string; signatureUrl?: string },
  ) {
    const driver = await this.ensureDriver(tenantId, userId);
    const job = await this.prisma.deliveryJob.findFirst({
      where: { id: jobId, tenantId, driverId: driver.id },
    });
    if (!job) throw new ForbiddenException('Job not assigned to you');

    const data: Record<string, unknown> = { status: next };
    if (next === 'ARRIVED') data.arrivedAt = new Date();
    if (next === 'PICKED_UP') {
      data.pickedUpAt = new Date();
      data.pickupPhotoUrl = extras?.pickupPhotoUrl;
    }
    if (next === 'DELIVERED') {
      data.deliveredAt = new Date();
      data.podPhotoUrl = extras?.podPhotoUrl;
      data.signatureUrl = extras?.signatureUrl;
    }

    const updated = await this.prisma.deliveryJob.update({
      where: { id: jobId },
      data,
    });

    if (next === 'DELIVERED') {
      const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
      const pct = Number(settings?.deliveryCommissionPct || 10);
      const gross = 50;
      const amount = Math.round(gross * (1 - pct / 100) * 100) / 100;
      await this.prisma.driverEarning.create({
        data: {
          id: randomUUID(),
          driverId: driver.id,
          jobId: job.id,
          amount,
        },
      });
      await this.prisma.order.update({
        where: { id: job.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    return updated;
  }

  async earnings(tenantId: string, userId: string) {
    const driver = await this.ensureDriver(tenantId, userId);
    const rows = await this.prisma.driverEarning.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    return { total, rows: rows.map((r) => ({ ...r, amount: Number(r.amount) })) };
  }
}
