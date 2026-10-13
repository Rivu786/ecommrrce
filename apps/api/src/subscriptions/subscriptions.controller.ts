import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { SubscriptionsService } from './subscriptions.service';
import { Roles } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CreatePlanDto {
  @IsString() productId!: string;
  @IsString() name!: string;
  @IsString() interval!: string;
  @IsNumber() price!: number;
}

class SubscribeDto {
  @IsString() planId!: string;
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('subscription-plans')
  listPlans(@CurrentTenant() tenant: RequestTenant) {
    return this.subscriptions.listPlans(tenant.id);
  }

  @Post('admin/subscription-plans')
  @Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
  createPlan(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreatePlanDto) {
    return this.subscriptions.createPlan(tenant.id, dto);
  }

  @Post('subscriptions')
  subscribe(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptions.subscribe(tenant.id, user.id, dto.planId);
  }

  @Get('subscriptions/mine')
  mine(@CurrentTenant() tenant: RequestTenant, @CurrentUser() user: AuthUser) {
    return this.subscriptions.listMine(tenant.id, user.id);
  }

  @Post('subscriptions/:id/pause')
  pause(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.subscriptions.pause(tenant.id, user.id, id);
  }

  @Post('subscriptions/:id/cancel')
  cancel(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.subscriptions.cancel(tenant.id, user.id, id);
  }
}
