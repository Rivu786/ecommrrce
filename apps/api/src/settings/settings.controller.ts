import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleCode } from '@omnicommerce/shared';
import { SettingsService } from './settings.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class ShippingRateDto {
  @IsString() name!: string;
  @IsString() methodCode!: string;
  @IsNumber() price!: number;
  @IsOptional() @IsNumber() etaHours?: number;
}

class ShippingZoneDto {
  @IsString() name!: string;
  @IsOptional() @IsArray() countries?: string[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingRateDto)
  rates!: ShippingRateDto[];
}

@ApiTags('shipping')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller()
export class ShippingPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('shipping/rates')
  rates(@CurrentTenant() tenant: RequestTenant, @Query('country') country?: string) {
    return this.settings.listShippingRates(tenant.id, country);
  }
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('admin/settings')
@Roles(RoleCode.TENANT_ADMIN)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentTenant() tenant: RequestTenant) {
    return this.settings.get(tenant.id);
  }

  @Patch()
  patch(@CurrentTenant() tenant: RequestTenant, @Body() dto: Record<string, unknown>) {
    return this.settings.patch(tenant.id, dto);
  }

  @Post('shipping-zones')
  createZone(@CurrentTenant() tenant: RequestTenant, @Body() dto: ShippingZoneDto) {
    return this.settings.upsertShippingZone(tenant.id, dto);
  }
}
