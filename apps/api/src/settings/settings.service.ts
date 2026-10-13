import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (!settings) throw new NotFoundException('Settings not found');
    return {
      ...settings,
      deliveryRadiusKm:
        settings.deliveryRadiusKm != null ? Number(settings.deliveryRadiusKm) : null,
      deliveryCommissionPct:
        settings.deliveryCommissionPct != null ? Number(settings.deliveryCommissionPct) : null,
    };
  }

  async listShippingRates(tenantId: string, country?: string) {
    const zones = await this.prisma.shippingZone.findMany({
      where: { tenantId, isActive: true },
      include: { rates: true },
    });
    const out: Array<{
      zoneId: string;
      zoneName: string;
      methodCode: string;
      name: string;
      price: number;
      etaHours: number | null;
    }> = [];
    for (const zone of zones) {
      const countries = (zone.countries as string[] | null) || [];
      if (country && countries.length && !countries.includes(country)) continue;
      for (const rate of zone.rates) {
        out.push({
          zoneId: zone.id,
          zoneName: zone.name,
          methodCode: rate.methodCode,
          name: rate.name,
          price: Number(rate.price),
          etaHours: rate.etaHours,
        });
      }
    }
    return out;
  }

  async upsertShippingZone(
    tenantId: string,
    data: {
      name: string;
      countries?: string[];
      rates: Array<{ name: string; methodCode: string; price: number; etaHours?: number }>;
    },
  ) {
    const zone = await this.prisma.shippingZone.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        countries: data.countries || ['IN'],
        rates: {
          create: data.rates.map((r) => ({
            id: randomUUID(),
            name: r.name,
            methodCode: r.methodCode,
            price: r.price,
            etaHours: r.etaHours,
          })),
        },
      },
      include: { rates: true },
    });
    return zone;
  }

  async patch(tenantId: string, data: Record<string, unknown>) {
    const allowed = [
      'logoUrl',
      'faviconUrl',
      'primaryColor',
      'currencyCode',
      'locale',
      'timezone',
      'translationsJson',
      'taxRulesJson',
      'businessHoursJson',
      'pdfTemplateJson',
      'deliveryRadiusKm',
      'upiId',
      'bankAccountNumber',
      'bankIfsc',
      'bankBeneficiaryName',
      'tenantBankReference',
      'corsOrigins',
      'lowStockThreshold',
      'gstin',
      'legalAddress',
      'supportPhone',
      'letterheadUrl',
      'skuPrefix',
      'deliveryCommissionPct',
    ] as const;

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === 'deliveryCommissionPct' || key === 'deliveryRadiusKm' || key === 'lowStockThreshold') {
          update[key] = Number(data[key]);
        } else {
          update[key] = data[key];
        }
      }
    }

    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...update } as any,
      update,
    });
    return {
      ...settings,
      deliveryRadiusKm:
        settings.deliveryRadiusKm != null ? Number(settings.deliveryRadiusKm) : null,
    };
  }
}
