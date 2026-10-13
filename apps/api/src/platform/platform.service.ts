import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { RoleCode, DEFAULT_BRAND_PACK, BRAND_PERMISSION_KEYS } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { intersectPack } from '../auth/permission.guard';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listBrands() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { settings: true, permissionPack: true },
    });
  }

  async createBrand(
    actorId: string,
    input: {
      name: string;
      slug: string;
      permissionKeys?: string[];
      gstin?: string;
      supportPhone?: string;
      legalAddress?: string;
    },
  ) {
    const exists = await this.prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (exists) throw new ConflictException({ code: 'CONFLICT', message: 'Brand slug taken' });
    const keys = intersectPack(input.permissionKeys || DEFAULT_BRAND_PACK, BRAND_PERMISSION_KEYS);
    const tenant = await this.prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: input.name,
        slug: input.slug,
        settings: {
          create: {
            gstin: input.gstin,
            supportPhone: input.supportPhone,
            legalAddress: input.legalAddress,
            skuPrefix: input.slug.slice(0, 6).toUpperCase(),
            upiId: 'merchant@upi',
            bankBeneficiaryName: input.name,
            tenantBankReference: input.slug.toUpperCase(),
          },
        },
        warehouses: { create: { name: 'Main Warehouse', code: 'MAIN' } },
        permissionPack: { create: { keysJson: keys } },
      },
    });
    await this.audit.log({
      tenantId: tenant.id,
      actorId,
      action: 'brand.create',
      entityType: 'Tenant',
      entityId: tenant.id,
    });
    return tenant;
  }

  async createBrandAdmin(
    actorId: string,
    tenantId: string,
    input: { email: string; password: string; fullName: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Brand not found');
    const taken = await this.prisma.user.findFirst({ where: { tenantId, email: input.email } });
    if (taken) throw new ConflictException({ code: 'CONFLICT', message: 'Email taken' });
    const role = await this.prisma.role.findUnique({ where: { code: RoleCode.TENANT_ADMIN } });
    if (!role) throw new BadRequestException('Roles not seeded');
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 10),
        fullName: input.fullName,
        roles: { create: [{ roleId: role.id }] },
      },
    });
    await this.audit.log({
      tenantId,
      actorId,
      action: 'brand.admin.create',
      entityType: 'User',
      entityId: user.id,
    });
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  async setPack(actorId: string, tenantId: string, keys: string[]) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Brand not found');
    const next = intersectPack(keys, BRAND_PERMISSION_KEYS);
    const pack = await this.prisma.tenantPermissionPack.upsert({
      where: { tenantId },
      update: { keysJson: next },
      create: { tenantId, keysJson: next },
    });
    await this.audit.log({
      tenantId,
      actorId,
      action: 'brand.permissions.update',
      entityType: 'TenantPermissionPack',
      entityId: pack.id,
    });
    return pack;
  }
}
