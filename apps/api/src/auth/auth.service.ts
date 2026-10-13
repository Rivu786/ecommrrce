import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RoleCode } from '@omnicommerce/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerTenant(input: {
    tenantName: string;
    tenantSlug: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (existing) throw new ConflictException({ code: 'CONFLICT', message: 'Tenant slug taken' });

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);
    const tenantAdminRole = await this.prisma.role.findUnique({ where: { code: RoleCode.TENANT_ADMIN } });
    if (!tenantAdminRole) throw new BadRequestException('Roles not seeded');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.tenantName,
        slug: input.tenantSlug,
        settings: {
          create: {
            upiId: 'merchant@upi',
            bankBeneficiaryName: input.tenantName,
            tenantBankReference: input.tenantSlug.toUpperCase(),
          },
        },
        warehouses: {
          create: { name: 'Main Warehouse', code: 'MAIN' },
        },
        users: {
          create: {
            email: input.adminEmail,
            passwordHash,
            fullName: input.adminName,
            roles: { create: [{ roleId: tenantAdminRole.id }] },
          },
        },
      },
      include: { users: true },
    });

    const admin = tenant.users[0];
    return this.issueTokens(admin.id, admin.email, tenant.id);
  }

  async registerCustomer(tenantId: string, input: { email: string; password: string; fullName: string; phone?: string }) {
    const exists = await this.prisma.user.findFirst({ where: { tenantId, email: input.email } });
    if (exists) throw new ConflictException({ code: 'CONFLICT', message: 'Email already registered' });
    const role = await this.prisma.role.findUnique({ where: { code: RoleCode.CUSTOMER } });
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        roles: role ? { create: [{ roleId: role.id }] } : undefined,
      },
    });
    return this.issueTokens(user.id, user.email, tenantId);
  }

  async login(tenantId: string | null, email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: tenantId ? { tenantId, email } : { email, tenantId: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user.id, user.email, user.tenantId);
  }

  async refresh(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user.id, stored.user.email, stored.user.tenantId);
  }

  private async issueTokens(userId: string, email: string, tenantId: string | null) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, tenantId },
      {
        secret: this.config.get('JWT_ACCESS_SECRET') || 'dev-access-secret-change-me-32chars',
        expiresIn: (this.config.get('JWT_ACCESS_TTL') || '15m') as `${number}m`,
      },
    );
    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const days = 7;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '15m' };
  }
}
