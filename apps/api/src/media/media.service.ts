import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;

export function contentHash(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export type UploadedMedia = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  duplicate: boolean;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(tenantId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        url: true,
        filename: true,
        mimeType: true,
        byteSize: true,
        createdAt: true,
      },
    });
  }

  async upload(
    tenantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<UploadedMedia> {
    if (!file?.buffer?.length) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Choose an image file' });
    }
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Upload a JPEG, PNG, WebP, or GIF',
      });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Image must be 8 MB or smaller' });
    }

    const sha256 = contentHash(file.buffer);
    const existing = await this.prisma.mediaAsset.findUnique({
      where: { tenantId_sha256: { tenantId, sha256 } },
    });
    if (existing) {
      return {
        id: existing.id,
        url: existing.url,
        filename: existing.filename,
        mimeType: existing.mimeType,
        byteSize: existing.byteSize,
        duplicate: true,
      };
    }

    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'image';
    const stored = await this.storage.uploadBuffer(file.buffer, {
      filename: safeName,
      contentType: file.mimetype,
      folder: `media/${tenantId}`,
    });
    const created = await this.prisma.mediaAsset.create({
      data: {
        id: randomUUID(),
        tenantId,
        sha256,
        url: stored.url,
        filename: safeName,
        mimeType: file.mimetype,
        byteSize: file.size,
      },
    });
    return {
      id: created.id,
      url: created.url,
      filename: created.filename,
      mimeType: created.mimeType,
      byteSize: created.byteSize,
      duplicate: false,
    };
  }
}
