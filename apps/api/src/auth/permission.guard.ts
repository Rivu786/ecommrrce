import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode, BRAND_PERMISSION_KEYS } from '@omnicommerce/shared';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, ROLES_KEY } from '../common/decorators/auth.decorators';
import { AuthUser } from '../common/decorators/current.decorators';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPerms =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!requiredPerms.length && !requiredRoles.length) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permission' });
    }
    if (user.roles?.includes(RoleCode.SUPER_ADMIN)) return true;

    if (requiredRoles.length && user.roles?.some((r) => requiredRoles.includes(r))) {
      if (!requiredPerms.length) return true;
    }

    const perms = user.permissions || [];
    const ok = requiredPerms.some((k) => perms.includes(k) || perms.includes('*'));
    const roleOk = requiredRoles.length ? user.roles?.some((r) => requiredRoles.includes(r)) : true;

    if (requiredPerms.length && ok) return true;
    if (!requiredPerms.length && roleOk) return true;

    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permission' });
  }
}

export function intersectPack(requested: string[], pack: string[]): string[] {
  const allowed = new Set(pack.length ? pack : BRAND_PERMISSION_KEYS);
  return requested.filter((k) => allowed.has(k));
}
