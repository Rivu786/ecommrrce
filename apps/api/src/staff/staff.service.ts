import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { RoleCode, BRAND_PERMISSION_KEYS } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';
import { intersectPack } from '../auth/permission.guard';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, roles: { some: { role: { code: { not: RoleCode.CUSTOMER } } } } },
      include: { roles: { include: { role: true } }, tenantRoles: { include: { role: true } } },
    });
    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  listRoles(tenantId: string) {
    return this.prisma.tenantRole.findMany({ where: { tenantId } });
  }

  async createRole(tenantId: string, actorPerms: string[], name: string, keys: string[]) {
    const pack = await this.pack(tenantId);
    const ceiling = actorPerms.includes('*') ? pack : intersectPack(actorPerms, pack);
    const next = intersectPack(keys, ceiling);
    return this.prisma.tenantRole.create({
      data: { id: randomUUID(), tenantId, name, keysJson: next },
    });
  }

  async createStaff(
    tenantId: string,
    actorPerms: string[],
    input: { email: string; password: string; fullName: string; roleCode?: string; tenantRoleId?: string },
  ) {
    if (!actorPerms.includes('staff.manage') && !actorPerms.includes('*')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Cannot manage staff' });
    }
    const exists = await this.prisma.user.findFirst({ where: { tenantId, email: input.email } });
    if (exists) throw new ConflictException({ code: 'CONFLICT', message: 'Email taken' });
    const code = input.roleCode || RoleCode.STORE_MANAGER;
    if (code === RoleCode.SUPER_ADMIN || code === RoleCode.TENANT_ADMIN) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Cannot assign this role' });
    }
    const role = await this.prisma.role.findUnique({ where: { code } });
    if (!role) throw new NotFoundException('Role not found');
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 10),
        fullName: input.fullName,
        roles: { create: [{ roleId: role.id }] },
      },
    });
    if (input.tenantRoleId) {
      const tr = await this.prisma.tenantRole.findFirst({
        where: { id: input.tenantRoleId, tenantId },
      });
      if (tr) {
        await this.prisma.userTenantRole.create({
          data: { userId: user.id, tenantRoleId: tr.id },
        });
      }
    }
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  private async pack(tenantId: string) {
    const row = await this.prisma.tenantPermissionPack.findUnique({ where: { tenantId } });
    return ((row?.keysJson as string[]) || BRAND_PERMISSION_KEYS) as string[];
  }
}
