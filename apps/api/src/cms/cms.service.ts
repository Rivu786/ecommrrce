import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  listPages(tenantId: string, status?: string) {
    return this.prisma.cmsPage.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { blocks: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPage(tenantId: string, slug: string) {
    const page = await this.prisma.cmsPage.findFirst({
      where: { tenantId, slug, status: 'PUBLISHED' },
      include: { blocks: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  createPage(
    tenantId: string,
    data: {
      title: string;
      slug: string;
      status?: string;
      metaTitle?: string;
      metaDescription?: string;
      blocks?: Array<{ type: string; sortOrder?: number; contentJson: object }>;
    },
  ) {
    return this.prisma.cmsPage.create({
      data: {
        id: randomUUID(),
        tenantId,
        title: data.title,
        slug: data.slug,
        status: data.status || 'DRAFT',
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        blocks: data.blocks?.length
          ? {
              create: data.blocks.map((b, i) => ({
                id: randomUUID(),
                type: b.type,
                sortOrder: b.sortOrder ?? i,
                contentJson: b.contentJson,
              })),
            }
          : undefined,
      },
      include: { blocks: true },
    });
  }

  async updatePage(tenantId: string, id: string, data: Record<string, unknown>) {
    const page = await this.prisma.cmsPage.findFirst({ where: { id, tenantId } });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.cmsPage.update({
      where: { id },
      data: {
        title: data.title as string | undefined,
        slug: data.slug as string | undefined,
        status: data.status as string | undefined,
        metaTitle: data.metaTitle as string | undefined,
        metaDescription: data.metaDescription as string | undefined,
      },
      include: { blocks: true },
    });
  }

  listHomepageSections(tenantId: string) {
    return this.prisma.homepageSection.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createHomepageSection(
    tenantId: string,
    data: { type: string; title?: string; sortOrder?: number; configJson: object; pageId?: string },
  ) {
    return this.prisma.homepageSection.create({
      data: {
        id: randomUUID(),
        tenantId,
        type: data.type,
        title: data.title,
        sortOrder: data.sortOrder ?? 0,
        configJson: data.configJson,
        pageId: data.pageId,
      },
    });
  }

  listFaqs(tenantId: string, productId?: string) {
    return this.prisma.faq.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(productId ? { productId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createFaq(
    tenantId: string,
    data: { question: string; answer: string; productId?: string; sortOrder?: number },
  ) {
    return this.prisma.faq.create({
      data: {
        id: randomUUID(),
        tenantId,
        question: data.question,
        answer: data.answer,
        productId: data.productId,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async sitemap(tenantId: string) {
    const [products, pages, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.cmsPage.findMany({
        where: { tenantId, status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.category.findMany({
        where: { tenantId, isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    return {
      products: products.map((p) => ({ loc: `/products/${p.slug}`, lastmod: p.updatedAt })),
      pages: pages.map((p) => ({ loc: `/pages/${p.slug}`, lastmod: p.updatedAt })),
      categories: categories.map((c) => ({
        loc: `/categories/${c.slug}`,
        lastmod: c.updatedAt,
      })),
    };
  }
}
