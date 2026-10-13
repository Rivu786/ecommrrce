import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleCode } from '@omnicommerce/shared';
import { InventoryService } from './inventory.service';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';
import { Roles, RequirePermissions } from '../common/decorators/auth.decorators';

class CreateWarehouseDto {
  @IsString()
  name!: string;
  @IsString()
  code!: string;
}

class AdjustDto {
  @IsString()
  warehouseId!: string;
  @IsString()
  variantId!: string;
  @IsInt()
  delta!: number;
  @IsOptional()
  @IsString()
  reason?: string;
}

class TransferDto {
  @IsString()
  fromWarehouseId!: string;
  @IsString()
  toWarehouseId!: string;
  @IsString()
  variantId!: string;
  @IsInt()
  @Min(1)
  quantity!: number;
}

class PoItemDto {
  @IsString() variantId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() sku?: string;
}

class CreatePoDto {
  @IsString() warehouseId!: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemDto)
  items!: PoItemDto[];
}

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER, RoleCode.FULFILLMENT_CLERK)
export class InventoryAdminController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('warehouses')
  listWarehouses(@CurrentTenant() tenant: RequestTenant) {
    return this.inventory.listWarehouses(tenant.id);
  }

  @Post('warehouses')
  createWarehouse(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateWarehouseDto) {
    return this.inventory.createWarehouse(tenant.id, dto);
  }

  @Get('levels')
  levels(
    @CurrentTenant() tenant: RequestTenant,
    @Query('warehouseId') warehouseId?: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.inventory.getLevels(tenant.id, { warehouseId, variantId });
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  adjust(@CurrentTenant() tenant: RequestTenant, @Body() dto: AdjustDto) {
    return this.inventory.adjust(tenant.id, dto);
  }

  @Post('transfer')
  @RequirePermissions('inventory.adjust')
  transfer(@CurrentTenant() tenant: RequestTenant, @Body() dto: TransferDto) {
    return this.inventory.transfer(tenant.id, dto);
  }

  @Get('purchase-orders')
  listPo(@CurrentTenant() tenant: RequestTenant) {
    return this.inventory.listPurchaseOrders(tenant.id);
  }

  @Post('purchase-orders')
  @RequirePermissions('inventory.adjust')
  createPo(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreatePoDto) {
    return this.inventory.createPurchaseOrder(tenant.id, dto);
  }

  @Post('purchase-orders/:id/receive')
  @RequirePermissions('inventory.adjust')
  receivePo(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.inventory.receivePurchaseOrder(tenant.id, id);
  }
}
