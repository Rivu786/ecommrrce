import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '@omnicommerce/shared';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../common/decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    // Platform operators can open any tenant console route when X-Tenant-ID is set.
    if (user?.roles?.includes(RoleCode.SUPER_ADMIN)) return true;
    if (!user?.roles?.some((r: string) => required.includes(r))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient role' });
    }
    return true;
  }
}
