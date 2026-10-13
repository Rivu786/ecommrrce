import { Body, Controller, Get, Param, Post, Put, Req, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { RoleCode } from '@omnicommerce/shared';
import { PlatformService } from './platform.service';
import { Roles, RequirePermissions } from '../common/decorators/auth.decorators';
import { AuthUser, CurrentUser } from '../common/decorators/current.decorators';

class CreateBrandDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsArray() permissionKeys?: string[];
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() supportPhone?: string;
  @IsOptional() @IsString() legalAddress?: string;
}

class CreateAdminDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() fullName!: string;
}

class PackDto {
  @IsArray() keys!: string[];
}

@ApiTags('platform')
@ApiBearerAuth()
@Controller('admin/platform')
@Roles(RoleCode.SUPER_ADMIN)
@RequirePermissions('platform.brands.write')
@Throttle({ default: { limit: 40, ttl: 60_000 } })
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('brands')
  list(@CurrentUser() user: AuthUser, @Req() req: { ip?: string }) {
    this.assertIp(req);
    return this.platform.listBrands();
  }

  @Post('brands')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBrandDto, @Req() req: { ip?: string }) {
    this.assertIp(req);
    return this.platform.createBrand(user.id, dto);
  }

  @Post('brands/:id/admins')
  createAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateAdminDto,
    @Req() req: { ip?: string },
  ) {
    this.assertIp(req);
    return this.platform.createBrandAdmin(user.id, id, dto);
  }

  @Put('brands/:id/permissions')
  setPack(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PackDto,
    @Req() req: { ip?: string },
  ) {
    this.assertIp(req);
    return this.platform.setPack(user.id, id, dto.keys);
  }

  private assertIp(req: { ip?: string }) {
    const allow = process.env.PLATFORM_IP_ALLOWLIST;
    if (!allow?.trim()) return;
    const list = allow.split(',').map((s) => s.trim()).filter(Boolean);
    if (!list.length) return;
    const ip = (req.ip || '').replace('::ffff:', '');
    if (!list.includes(ip)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'IP not allowlisted' });
    }
  }
}
