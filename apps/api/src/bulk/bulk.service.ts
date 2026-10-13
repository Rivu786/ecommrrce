import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async importProducts(tenantId: string, csvContent: string) {
    const job = await this.prisma.importExportJob.create({
      data: {
        id: randomUUID(),
        tenantId,
        type: 'IMPORT',
        entity: 'products',
        status: 'RUNNING',
      },
    });

    try {
      const rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;

      let created = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          const slug = row.slug || row.name?.toLowerCase().replace(/\s+/g, '-');
          if (!row.name || !slug) {
            errors.push(`Missing name/slug: ${JSON.stringify(row)}`);
            continue;
          }
          const existing = await this.prisma.product.findFirst({
            where: { tenantId, slug },
          });
          if (existing) {
            await this.prisma.product.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                description: row.description,
                brand: row.brand,
                sku: row.sku,
                status: row.status || existing.status,
              },
            });
            if (row.variant_sku && row.price) {
              await this.prisma.productVariant.upsert({
                where: {
                  tenantId_sku: { tenantId, sku: row.variant_sku },
                },
                create: {
                  id: randomUUID(),
                  tenantId,
                  productId: existing.id,
                  sku: row.variant_sku,
                  price: Number(row.price),
                  name: row.variant_name,
                },
                update: { price: Number(row.price), name: row.variant_name },
              });
            }
            updated++;
          } else {
            await this.prisma.product.create({
              data: {
                id: randomUUID(),
                tenantId,
                name: row.name,
                slug,
                description: row.description,
                brand: row.brand,
                sku: row.sku,
                status: row.status || 'DRAFT',
                variants: row.variant_sku
                  ? {
                      create: [
                        {
                          id: randomUUID(),
                          tenantId,
                          sku: row.variant_sku,
                          name: row.variant_name,
                          price: Number(row.price || 0),
                        },
                      ],
                    }
                  : undefined,
              },
            });
            created++;
          }
        } catch (e) {
          errors.push(String(e));
        }
      }

      const result = { created, updated, errors };
      await this.prisma.importExportJob.update({
        where: { id: job.id },
        data: {
          status: errors.length && !created && !updated ? 'FAILED' : 'COMPLETED',
          resultJson: result,
          finishedAt: new Date(),
        },
      });
      return { jobId: job.id, ...result };
    } catch (e) {
      await this.prisma.importExportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          resultJson: { error: String(e) },
          finishedAt: new Date(),
        },
      });
      throw e;
    }
  }

  async importInventory(tenantId: string, csvContent: string) {
    const job = await this.prisma.importExportJob.create({
      data: {
        id: randomUUID(),
        tenantId,
        type: 'IMPORT',
        entity: 'inventory',
        status: 'RUNNING',
      },
    });

    try {
      const rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;

      let upserted = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          const warehouse = await this.prisma.warehouse.findFirst({
            where: { tenantId, code: row.warehouse_code },
          });
          const variant = await this.prisma.productVariant.findFirst({
            where: { tenantId, sku: row.sku },
          });
          if (!warehouse || !variant) {
            errors.push(`Missing warehouse/variant for ${row.sku}/${row.warehouse_code}`);
            continue;
          }
          await this.prisma.inventoryLevel.upsert({
            where: {
              warehouseId_variantId: {
                warehouseId: warehouse.id,
                variantId: variant.id,
              },
            },
            create: {
              id: randomUUID(),
              tenantId,
              warehouseId: warehouse.id,
              variantId: variant.id,
              quantity: Number(row.quantity || 0),
              reserved: Number(row.reserved || 0),
            },
            update: {
              quantity: Number(row.quantity || 0),
              reserved: row.reserved != null ? Number(row.reserved) : undefined,
            },
          });
          upserted++;
        } catch (e) {
          errors.push(String(e));
        }
      }

      const result = { upserted, errors };
      await this.prisma.importExportJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          resultJson: result,
          finishedAt: new Date(),
        },
      });
      return { jobId: job.id, ...result };
    } catch (e) {
      await this.prisma.importExportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          resultJson: { error: String(e) },
          finishedAt: new Date(),
        },
      });
      throw e;
    }
  }

  async exportProducts(tenantId: string) {
    const job = await this.prisma.importExportJob.create({
      data: {
        id: randomUUID(),
        tenantId,
        type: 'EXPORT',
        entity: 'products',
        status: 'RUNNING',
      },
    });

    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: { variants: true },
    });

    const rows: Record<string, string | number>[] = [];
    for (const p of products) {
      if (!p.variants.length) {
        rows.push({
          name: p.name,
          slug: p.slug,
          description: p.description || '',
          brand: p.brand || '',
          sku: p.sku || '',
          status: p.status,
          variant_sku: '',
          variant_name: '',
          price: '',
        });
      } else {
        for (const v of p.variants) {
          rows.push({
            name: p.name,
            slug: p.slug,
            description: p.description || '',
            brand: p.brand || '',
            sku: p.sku || '',
            status: p.status,
            variant_sku: v.sku,
            variant_name: v.name || '',
            price: Number(v.price),
          });
        }
      }
    }

    const csv = stringify(rows, { header: true });
    const uploaded = await this.storage.uploadBuffer(Buffer.from(csv, 'utf8'), {
      filename: `products-${tenantId}.csv`,
      contentType: 'text/csv',
      folder: 'exports',
    });

    await this.prisma.importExportJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        fileUrl: uploaded.url,
        resultJson: { rows: rows.length },
        finishedAt: new Date(),
      },
    });

    return { jobId: job.id, fileUrl: uploaded.url, csv };
  }

  async exportInventory(tenantId: string) {
    const job = await this.prisma.importExportJob.create({
      data: {
        id: randomUUID(),
        tenantId,
        type: 'EXPORT',
        entity: 'inventory',
        status: 'RUNNING',
      },
    });

    const levels = await this.prisma.inventoryLevel.findMany({
      where: { tenantId },
      include: { warehouse: true, variant: true },
    });

    const rows = levels.map((l) => ({
      warehouse_code: l.warehouse.code,
      sku: l.variant.sku,
      quantity: l.quantity,
      reserved: l.reserved,
    }));

    const csv = stringify(rows, { header: true });
    const uploaded = await this.storage.uploadBuffer(Buffer.from(csv, 'utf8'), {
      filename: `inventory-${tenantId}.csv`,
      contentType: 'text/csv',
      folder: 'exports',
    });

    await this.prisma.importExportJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        fileUrl: uploaded.url,
        resultJson: { rows: rows.length },
        finishedAt: new Date(),
      },
    });

    return { jobId: job.id, fileUrl: uploaded.url, csv };
  }

  listJobs(tenantId: string) {
    return this.prisma.importExportJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
