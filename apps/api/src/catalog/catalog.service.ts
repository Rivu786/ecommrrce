import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async listProducts(
    tenantId: string,
    query: {
      cursor?: string;
      take?: number;
      q?: string;
      categoryId?: string;
      brand?: string;
      status?: string;
      tag?: string;
    },
  ) {
    const take = Math.min(query.take ?? 20, 100);
    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : { status: 'ACTIVE' }),
      ...(query.brand ? { brand: query.brand } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { slug: { contains: query.q } },
              { sku: { contains: query.q } },
              { variants: { some: { OR: [{ sku: { contains: query.q } }, { barcode: { contains: query.q } }] } } },
            ],
          }
        : {}),
      ...(query.categoryId
        ? { categories: { some: { categoryId: query.categoryId } } }
        : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    };

    const items = await this.prisma.product.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 5 },
        variants: { where: { isActive: true }, take: 20 },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    return {
      data: data.map((p) => this.serializeProduct(p)),
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
    };
  }

  async getProduct(tenantId: string, idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        attributes: { include: { attributeValue: { include: { attribute: true } } } },
        addonGroups: { include: { options: true } },
      },
    });
    if (!product) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Product not found' });
    const merch = await this.merchandising(tenantId, product.id, product.categories?.[0]?.categoryId);
    const variantIds = product.variants.map((v) => v.id);
    const availability = await this.inventory.availabilityByVariant(tenantId, variantIds);
    return { ...this.serializeProduct(product), ...merch, availability };
  }

  async createProduct(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      sku?: string;
      brand?: string;
      status?: string;
      categoryIds?: string[];
      allowSpecialInstructions?: boolean;
      specialInstructionsRequired?: boolean;
      metaTitle?: string;
      metaDescription?: string;
      canonicalUrl?: string;
      variants?: Array<{
        sku?: string;
        name?: string;
        price: number;
        compareAtPrice?: number;
        barcode?: string;
      }>;
    },
  ) {
    const exists = await this.prisma.product.findFirst({
      where: { tenantId, slug: data.slug },
    });
    if (exists) throw new ConflictException({ code: 'CONFLICT', message: 'Slug taken' });

    const sku = data.sku || (await this.nextSku(tenantId));
    const product = await this.prisma.product.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        sku,
        brand: data.brand,
        status: data.status || 'DRAFT',
        allowSpecialInstructions: Boolean(data.allowSpecialInstructions),
        specialInstructionsRequired: Boolean(data.specialInstructionsRequired),
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        canonicalUrl: data.canonicalUrl,
        categories: data.categoryIds?.length
          ? {
              create: data.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
        variants: data.variants?.length
          ? {
              create: data.variants.map((v, i) => ({
                id: randomUUID(),
                tenantId,
                sku: v.sku || `${sku}-${i + 1}`,
                name: v.name,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                barcode: v.barcode,
              })),
            }
          : {
              create: [
                {
                  id: randomUUID(),
                  tenantId,
                  sku: `${sku}-1`,
                  name: 'Default',
                  price: 0,
                },
              ],
            },
      },
      include: { variants: true, categories: true },
    });
    return this.serializeProduct(product);
  }

  async updateProduct(tenantId: string, id: string, data: Record<string, unknown>) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name as string | undefined,
        slug: data.slug as string | undefined,
        description: data.description as string | undefined,
        sku: data.sku as string | undefined,
        brand: data.brand as string | undefined,
        status: data.status as string | undefined,
        metaTitle: data.metaTitle as string | undefined,
        metaDescription: data.metaDescription as string | undefined,
      },
      include: { variants: true, images: true },
    });
    return this.serializeProduct(updated);
  }

  async deleteProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  listCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      parentId?: string;
      description?: string;
      imageUrl?: string;
      sortOrder?: number;
    },
  ) {
    return this.prisma.category.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        slug: data.slug,
        parentId: data.parentId,
        description: data.description,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(tenantId: string, id: string, data: Record<string, unknown>) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name as string | undefined,
        slug: data.slug as string | undefined,
        parentId: data.parentId as string | undefined,
        description: data.description as string | undefined,
        imageUrl: data.imageUrl as string | undefined,
        sortOrder: data.sortOrder as number | undefined,
        isActive: data.isActive as boolean | undefined,
      },
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  listAttributes(tenantId: string) {
    return this.prisma.attribute.findMany({
      where: { tenantId },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createAttribute(
    tenantId: string,
    data: { code: string; name: string; type?: string; values?: string[] },
  ) {
    return this.prisma.attribute.create({
      data: {
        id: randomUUID(),
        tenantId,
        code: data.code,
        name: data.name,
        type: data.type || 'text',
        values: data.values?.length
          ? {
              create: data.values.map((value, i) => ({
                id: randomUUID(),
                value,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: { values: true },
    });
  }

  async updateAttribute(tenantId: string, id: string, data: { name?: string; type?: string }) {
    const attr = await this.prisma.attribute.findFirst({ where: { id, tenantId } });
    if (!attr) throw new NotFoundException('Attribute not found');
    return this.prisma.attribute.update({
      where: { id },
      data: { name: data.name, type: data.type },
      include: { values: true },
    });
  }

  async deleteAttribute(tenantId: string, id: string) {
    const attr = await this.prisma.attribute.findFirst({ where: { id, tenantId } });
    if (!attr) throw new NotFoundException('Attribute not found');
    await this.prisma.attribute.delete({ where: { id } });
    return { ok: true };
  }

  listBundles(tenantId: string) {
    return this.prisma.bundle.findMany({
      where: { tenantId, isActive: true },
      include: { items: { include: { product: true } } },
    });
  }

  async createBundle(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      price: number;
      items?: Array<{ productId: string; quantity: number }>;
    },
  ) {
    return this.prisma.bundle.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: data.name,
        slug: data.slug,
        price: data.price,
        items: data.items?.length
          ? {
              create: data.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
  }

  listTags(tenantId: string) {
    return this.prisma.tag.findMany({ where: { tenantId } });
  }

  async createTag(tenantId: string, data: { name: string; slug: string }) {
    return this.prisma.tag.create({
      data: { id: randomUUID(), tenantId, name: data.name, slug: data.slug },
    });
  }

  async compare(tenantId: string, ids: string[]) {
    const productIds = ids.filter(Boolean).slice(0, 6);
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds } },
      include: {
        variants: { where: { isActive: true } },
        attributes: { include: { attributeValue: { include: { attribute: true } } } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
    });
    return { products: products.map((p) => this.serializeProduct(p)) };
  }

  async jsonLd(tenantId: string, idOrSlug: string) {
    const p = await this.getProduct(tenantId, idOrSlug);
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.metaDescription || p.description,
      sku: p.sku,
      url: p.canonicalUrl,
      image: p.images?.[0]?.url,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: Math.min(...(p.variants || []).map((v: any) => Number(v.price) || 0)),
      },
    };
  }

  private async nextSku(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const prefix = (settings?.skuPrefix || 'SKU').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
    const seq = await this.prisma.product.count({ where: { tenantId } });
    let sku = `${prefix}-${String(seq + 1).padStart(6, '0')}`;
    while (await this.prisma.product.findFirst({ where: { tenantId, sku } })) {
      sku = `${prefix}-${String(Date.now()).slice(-6)}`;
    }
    return sku;
  }

  async pinRelation(
    tenantId: string,
    fromProductId: string,
    toProductId: string,
    relationType: string,
  ) {
    return this.prisma.productRelation.create({
      data: {
        id: randomUUID(),
        tenantId,
        fromProductId,
        toProductId,
        relationType: relationType || 'RELATED',
      },
    });
  }

  async hideRecommendation(tenantId: string, productId: string, hiddenId: string) {
    return this.prisma.hiddenRecommendation.upsert({
      where: {
        tenantId_productId_hiddenId: { tenantId, productId, hiddenId },
      },
      create: { id: randomUUID(), tenantId, productId, hiddenId },
      update: {},
    });
  }

  async unhideRecommendation(tenantId: string, productId: string, hiddenId: string) {
    await this.prisma.hiddenRecommendation.deleteMany({
      where: { tenantId, productId, hiddenId },
    });
    return { ok: true };
  }

  private async merchandising(tenantId: string, productId: string, categoryId?: string) {
    const pinned = await this.prisma.productRelation.findMany({
      where: { tenantId, fromProductId: productId },
      include: { toProduct: { include: { images: { take: 1 } } } },
    });
    const hidden = await this.prisma.hiddenRecommendation.findMany({
      where: { tenantId, productId },
    });
    const hide = new Set(hidden.map((h) => h.hiddenId));
    const relatedPinned = pinned.filter((r) => r.relationType === 'RELATED').map((r) => r.toProduct);
    let relatedAuto: any[] = [];
    if (categoryId) {
      relatedAuto = await this.prisma.product.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          id: { not: productId },
          categories: { some: { categoryId } },
        },
        take: 8,
        include: { images: { take: 1 } },
      });
    }
    const relatedMap = new Map<string, any>();
    for (const p of [...relatedPinned, ...relatedAuto]) {
      if (p && !hide.has(p.id)) relatedMap.set(p.id, p);
    }
    const alsoBought = await this.prisma.orderItem.groupBy({
      by: ['variantId'],
      where: {
        order: { tenantId, status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      },
      _count: { _all: true },
      orderBy: { _count: { variantId: 'desc' } },
      take: 12,
    });
    const variantIds = alsoBought.map((a) => a.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { images: { take: 1 } } } },
    });
    const recommendedMap = new Map<string, any>();
    for (const v of variants) {
      if (v.product.id !== productId && !hide.has(v.product.id)) {
        recommendedMap.set(v.product.id, v.product);
      }
    }
    if (recommendedMap.size < 4) {
      const pop = await this.prisma.product.findMany({
        where: { tenantId, status: 'ACTIVE', id: { not: productId } },
        orderBy: { popularityScore: 'desc' },
        take: 8,
        include: { images: { take: 1 } },
      });
      for (const p of pop) {
        if (!hide.has(p.id)) recommendedMap.set(p.id, p);
      }
    }
    return {
      related: [...relatedMap.values()].slice(0, 8).map((p) => this.serializeProduct(p)),
      recommended: [...recommendedMap.values()].slice(0, 8).map((p) => this.serializeProduct(p)),
    };
  }

  private serializeProduct(p: any) {
    return {
      ...p,
      variants: p.variants?.map((v: any) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice != null ? Number(v.compareAtPrice) : null,
      })),
    };
  }
}
