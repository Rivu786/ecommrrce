import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '@omnicommerce/shared';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../common/decorators/auth.decorators';
import { RolesGuard } from './roles.guard';

function contextFor(user: { roles?: string[] } | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER];
      return undefined;
    },
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  it('allows a super admin into tenant console routes', () => {
    expect(
      guard.canActivate(contextFor({ roles: [RoleCode.SUPER_ADMIN] })),
    ).toBe(true);
  });

  it('allows a tenant admin when the route lists that role', () => {
    expect(
      guard.canActivate(contextFor({ roles: [RoleCode.TENANT_ADMIN] })),
    ).toBe(true);
  });

  it('rejects a customer on tenant console routes', () => {
    expect(() => guard.canActivate(contextFor({ roles: [RoleCode.CUSTOMER] }))).toThrow(
      ForbiddenException,
    );
  });
});
