import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { AnalyticsService } from './analytics.service';
import { Public, Roles, RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class TrackDto {
  @IsString() type!: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsObject() payloadJson?: object;
}

@ApiTags('analytics')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post('analytics/track')
  track(@CurrentTenant() tenant: RequestTenant, @Body() dto: TrackDto) {
    return this.analytics.track(tenant.id, dto);
  }

  @Get('admin/analytics/dashboard')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  @RequirePermissions('analytics.view')
  dashboard(@CurrentTenant() tenant: RequestTenant) {
    return this.analytics.dashboard(tenant.id);
  }

  @Get('admin/analytics/reports')
  @ApiBearerAuth()
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  @RequirePermissions('analytics.view')
  reports(
    @CurrentTenant() tenant: RequestTenant,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('channel') channel?: string,
  ) {
    return this.analytics.reports(tenant.id, from, to, channel);
  }
}
