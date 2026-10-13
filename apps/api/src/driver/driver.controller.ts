import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { DriverService } from './driver.service';
import { Roles } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class OnlineDto {
  @IsBoolean() isOnline!: boolean;
}

class LocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
}

class AdvanceDto {
  @IsString() status!: 'ARRIVED' | 'PICKED_UP' | 'DELIVERED';
  @IsOptional() @IsString() pickupPhotoUrl?: string;
  @IsOptional() @IsString() podPhotoUrl?: string;
  @IsOptional() @IsString() signatureUrl?: string;
}

@ApiTags('driver')
@ApiBearerAuth()
@Controller('driver')
@Roles(RoleCode.DRIVER, RoleCode.TENANT_ADMIN)
export class DriverController {
  constructor(private readonly driver: DriverService) {}

  @Post('online')
  setOnline(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: OnlineDto,
  ) {
    return this.driver.setOnline(tenant.id, user.id, dto.isOnline);
  }

  @Post('location')
  location(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: LocationDto,
  ) {
    return this.driver.updateLocation(tenant.id, user.id, dto.lat, dto.lng);
  }

  @Get('jobs')
  jobs(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.driver.listJobs(
      tenant.id,
      user.id,
      status,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
    );
  }

  @Post('jobs/:id/accept')
  accept(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.driver.acceptJob(tenant.id, user.id, id);
  }

  @Post('jobs/:id/advance')
  advance(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdvanceDto,
  ) {
    return this.driver.advanceJob(tenant.id, user.id, id, dto.status, dto);
  }

  @Get('earnings')
  earnings(@CurrentTenant() tenant: RequestTenant, @CurrentUser() user: AuthUser) {
    return this.driver.earnings(tenant.id, user.id);
  }
}
