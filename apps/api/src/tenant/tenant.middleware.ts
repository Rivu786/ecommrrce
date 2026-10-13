import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const tenantIdHeader = req.header('x-tenant-id');
    const apiKey = req.header('x-tenant-api-key');
    const slug = req.header('x-tenant-slug');

    if (apiKey) {
      const prefix = apiKey.slice(0, 8);
      const hash = createHash('sha256').update(apiKey).digest('hex');
      const key = await this.prisma.apiKey.findFirst({
        where: { keyPrefix: prefix, keyHash: hash, revokedAt: null },
        include: { tenant: true },
      });
      if (!key || !key.tenant.isActive) {
        throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid API key' });
      }
      (req as any).tenant = { id: key.tenant.id, slug: key.tenant.slug };
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
      return next();
    }

    if (tenantIdHeader) {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          OR: [{ id: tenantIdHeader }, { slug: tenantIdHeader }],
          isActive: true,
        },
      });
      if (!tenant) {
        throw new BadRequestException({ code: 'TENANT_REQUIRED', message: 'Invalid tenant' });
      }
      (req as any).tenant = { id: tenant.id, slug: tenant.slug };
      return next();
    }

    if (slug) {
      const tenant = await this.prisma.tenant.findFirst({ where: { slug, isActive: true } });
      if (!tenant) {
        throw new BadRequestException({ code: 'TENANT_REQUIRED', message: 'Invalid tenant slug' });
      }
      (req as any).tenant = { id: tenant.id, slug: tenant.slug };
      return next();
    }

    // Allow health/docs/auth/platform without tenant
    // Use originalUrl + path: Nest/Express path shape can omit leading slashes or prefix.
    const path = `${req.originalUrl || ''} ${req.path || ''} ${req.url || ''}`.toLowerCase();
    if (
      path.includes('health') ||
      path.includes('/docs') ||
      path.includes('uploads') ||
      path.includes('auth/login') ||
      path.includes('auth/refresh') ||
      path.includes('auth/register-tenant') ||
      path.includes('admin/platform')
    ) {
      return next();
    }

    throw new BadRequestException({
      code: 'TENANT_REQUIRED',
      message: 'X-Tenant-ID or X-Tenant-API-Key header required',
    });
  }
}
