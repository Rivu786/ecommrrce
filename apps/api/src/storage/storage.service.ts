import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT') || this.config.get<string>('MINIO_ENDPOINT');
    const accessKey = this.config.get<string>('S3_ACCESS_KEY') || this.config.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.config.get<string>('S3_SECRET_KEY') || this.config.get<string>('MINIO_SECRET_KEY');
    if (endpoint && accessKey && secretKey) {
      this.s3 = new S3Client({
        endpoint,
        region: this.config.get('S3_REGION') || 'us-east-1',
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      });
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    options: { filename?: string; contentType?: string; folder?: string } = {},
  ): Promise<{ url: string; key: string }> {
    const key = `${options.folder || 'uploads'}/${randomUUID()}-${options.filename || 'file'}`;
    const bucket = this.config.get('S3_BUCKET') || this.config.get('MINIO_BUCKET') || 'omnicommerce';

    if (this.s3) {
      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: options.contentType || 'application/octet-stream',
          }),
        );
        const publicBase = this.config.get('S3_PUBLIC_URL') || this.config.get('MINIO_PUBLIC_URL');
        const url = publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : `s3://${bucket}/${key}`;
        return { url, key };
      } catch (err) {
        this.logger.warn(`S3 upload failed, falling back to local: ${String(err)}`);
      }
    }

    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const localName = key.replace(/\//g, '_');
    const localPath = join(uploadsDir, localName);
    await writeFile(localPath, buffer);
    const port = this.config.get('API_PORT') || 4000;
    const publicBase = this.config.get('API_PUBLIC_URL') || `http://localhost:${port}`;
    return { url: `${publicBase.replace(/\/$/, '')}/uploads/${localName}`, key: localName };
  }
}
