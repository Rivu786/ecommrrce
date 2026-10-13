import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    data: {
      productId?: string;
      rating: number;
      title?: string;
      body?: string;
      mediaJson?: object;
      isStoreReview?: boolean;
    },
  ) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }
    let isVerifiedPurchase = false;
    if (data.productId) {
      const purchased = await this.prisma.orderItem.findFirst({
        where: {
          variant: { productId: data.productId },
          order: { tenantId, userId, status: { in: ['CONFIRMED', 'DELIVERED', 'SHIPPED'] } },
        },
      });
      isVerifiedPurchase = !!purchased;
    }
    return this.prisma.review.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        productId: data.productId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        mediaJson: data.mediaJson,
        isStoreReview: data.isStoreReview ?? false,
        isVerifiedPurchase,
        status: 'PENDING',
      },
    });
  }

  listPublic(tenantId: string, productId?: string) {
    return this.prisma.review.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        ...(productId ? { productId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listPending(tenantId: string) {
    return this.prisma.review.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async moderate(tenantId: string, id: string, status: 'APPROVED' | 'REJECTED') {
    const review = await this.prisma.review.findFirst({ where: { id, tenantId } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({ where: { id }, data: { status } });
  }
}
