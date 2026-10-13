import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CartService } from './cart.service';
import { Public } from '../common/decorators/auth.decorators';
import {
  CurrentTenant,
  CurrentUser,
  RequestTenant,
  AuthUser,
} from '../common/decorators/current.decorators';

class AddItemDto {
  @IsString()
  variantId!: string;
  @IsInt()
  @Min(1)
  quantity!: number;
  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateItemDto {
  @IsOptional()
  @IsInt()
  quantity?: number;
  @IsOptional()
  @IsString()
  notes?: string;
}

class ApplyCouponDto {
  @IsString()
  code!: string;
}

class MergeCartDto {
  @IsString()
  sessionId!: string;
}

@ApiTags('cart')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Post('merge')
  merge(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Body() dto: MergeCartDto,
  ) {
    return this.cart.mergeGuestCart(tenant.id, user.id, dto.sessionId);
  }

  @Public()
  @Get()
  getOrCreate(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser | undefined,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.cart.getOrCreate(tenant.id, {
      userId: user?.id,
      sessionId,
    });
  }

  @Public()
  @Get(':cartId')
  get(@CurrentTenant() tenant: RequestTenant, @Param('cartId') cartId: string) {
    return this.cart.getById(tenant.id, cartId);
  }

  @Public()
  @Post(':cartId/items')
  addItem(
    @CurrentTenant() tenant: RequestTenant,
    @Param('cartId') cartId: string,
    @Body() dto: AddItemDto,
  ) {
    return this.cart.addItem(tenant.id, cartId, dto);
  }

  @Public()
  @Patch(':cartId/items/:itemId')
  updateItem(
    @CurrentTenant() tenant: RequestTenant,
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cart.updateItem(tenant.id, cartId, itemId, dto);
  }

  @Public()
  @Delete(':cartId/items/:itemId')
  removeItem(
    @CurrentTenant() tenant: RequestTenant,
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cart.removeItem(tenant.id, cartId, itemId);
  }

  @Public()
  @Post(':cartId/coupon')
  applyCoupon(
    @CurrentTenant() tenant: RequestTenant,
    @Param('cartId') cartId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.cart.applyCoupon(tenant.id, cartId, dto.code);
  }
}
