import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RoleCode, BRAND_PERMISSION_KEYS } from '@omnicommerce/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret-change-me-32chars',
    });
  }

  async validate(payload: { sub: string; email: string; tenantId: string | null }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
        tenantRoles: { include: { role: true } },
      },
    });
    if (!user || !user.isActive) return null;
    const roles = user.roles.map((r) => r.role.code);

    let permissions: string[] = [];
    if (roles.includes(RoleCode.SUPER_ADMIN)) {
      permissions = ['*', 'platform.brands.write', ...BRAND_PERMISSION_KEYS];
    } else if (user.tenantId) {
      const pack = await this.prisma.tenantPermissionPack.findUnique({
        where: { tenantId: user.tenantId },
      });
      const packKeys = ((pack?.keysJson as string[]) || BRAND_PERMISSION_KEYS).filter(Boolean);
      if (roles.includes(RoleCode.TENANT_ADMIN)) {
        permissions = packKeys;
      } else {
        const custom = user.tenantRoles.flatMap((tr) => (tr.role.keysJson as string[]) || []);
        const fromRoles = new Set<string>();
        if (roles.includes(RoleCode.PAYMENT_VERIFIER)) fromRoles.add('payments.verify_qr');
        if (roles.includes(RoleCode.STORE_MANAGER)) {
          ['catalog.products.write', 'inventory.adjust', 'orders.write', 'cms.write'].forEach((k) =>
            fromRoles.add(k),
          );
        }
        if (roles.includes(RoleCode.FULFILLMENT_CLERK)) fromRoles.add('delivery.dispatch');
        if (roles.includes(RoleCode.DRIVER)) fromRoles.add('delivery.dispatch');
        permissions = [...new Set([...custom, ...fromRoles])].filter((k) => packKeys.includes(k));
      }
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
      permissions,
    };
  }
}
