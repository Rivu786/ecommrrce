import { Body, Controller, Post, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

class LoginDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(6)
  password!: string;
}

class RegisterDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(6)
  password!: string;
  @IsString()
  fullName!: string;
  @IsString()
  phone?: string;
}

class RegisterTenantDto {
  @IsString()
  tenantName!: string;
  @IsString()
  tenantSlug!: string;
  @IsEmail()
  adminEmail!: string;
  @IsString()
  @MinLength(6)
  adminPassword!: string;
  @IsString()
  adminName!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('register-tenant')
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register')
  async register(@Headers('x-tenant-id') tenantRef: string, @Body() dto: RegisterDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: tenantRef }, { slug: tenantRef }] },
    });
    if (!tenant) throw new Error('Tenant required');
    return this.auth.registerCustomer(tenant.id, dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  async login(@Headers('x-tenant-id') tenantRef: string | undefined, @Body() dto: LoginDto) {
    let tenantId: string | null = null;
    if (tenantRef) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { OR: [{ id: tenantRef }, { slug: tenantRef }] },
      });
      tenantId = tenant?.id ?? null;
    }
    return this.auth.login(tenantId, dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
