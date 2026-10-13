import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestTenant = {
  id: string;
  slug: string;
};

export type AuthUser = {
  id: string;
  email: string;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
};

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.tenant as RequestTenant | undefined;
});

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as AuthUser | undefined;
});
