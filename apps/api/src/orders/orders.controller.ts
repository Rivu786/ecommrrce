import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { OrdersService } from './orders.service';
import { Public, Roles, RequirePermissions } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class CheckoutDto {
  @IsString()
  cartId!: string;
  @IsOptional()
  @IsString()
  fulfillmentMode?: string;
  @IsOptional()
  @IsObject()
  shippingAddressJson?: object;
  @IsOptional()
  @IsObject()
  guestJson?: object;
  @IsOptional()
  @IsString()
  notes?: string;
  @IsOptional()
  @IsString()
  paymentMethod?: string;
  @IsOptional()
  @IsString()
  channel?: string;
  @IsOptional()
  @IsString()
  shippingMethod?: string;
}

@ApiTags('orders')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post('checkout')
  checkout(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CheckoutDto,
  ) {
    return this.orders.checkout(tenant.id, { ...dto, userId: user?.id });
  }

  @Get('mine')
  myOrders(@CurrentTenant() tenant: RequestTenant, @CurrentUser() user: AuthUser) {
    return this.orders.listOrders(tenant.id, { userId: user.id });
  }

  @Get(':id')
  get(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.orders.getOrder(tenant.id, id);
  }
}

class UpdateStatusDto {
  @IsString()
  status!: string;
}

@ApiTags('admin-orders')
@ApiBearerAuth()
@Controller('admin/orders')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER, RoleCode.FULFILLMENT_CLERK)
export class OrdersAdminController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentTenant() tenant: RequestTenant, @Query('status') status?: string) {
    return this.orders.listOrders(tenant.id, { status });
  }

  @Get(':id')
  get(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.orders.getOrder(tenant.id, id);
  }

  @Patch(':id/status')
  @RequirePermissions('orders.write')
  updateStatus(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.updateStatus(tenant.id, id, dto.status);
  }
}
