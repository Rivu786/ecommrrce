import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { MarketingService } from './marketing.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class CreateCouponDto {
  @IsString()
  code!: string;
  @IsString()
  type!: string;
  @IsNumber()
  value!: number;
  @IsOptional()
  @IsNumber()
  minCartTotal?: number;
  @IsOptional()
  @IsNumber()
  usageLimit?: number;
}

class CreateGiftCardDto {
  @IsOptional()
  @IsString()
  code?: string;
  @IsNumber()
  amount!: number;
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('admin/marketing')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
export class MarketingAdminController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('coupons')
  listCoupons(@CurrentTenant() tenant: RequestTenant) {
    return this.marketing.listCoupons(tenant.id);
  }

  @Post('coupons')
  createCoupon(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateCouponDto) {
    return this.marketing.createCoupon(tenant.id, dto);
  }

  @Patch('coupons/:id')
  updateCoupon(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.marketing.updateCoupon(tenant.id, id, dto);
  }

  @Delete('coupons/:id')
  deleteCoupon(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.marketing.deleteCoupon(tenant.id, id);
  }

  @Get('gift-cards')
  listGiftCards(@CurrentTenant() tenant: RequestTenant) {
    return this.marketing.listGiftCards(tenant.id);
  }

  @Post('gift-cards')
  createGiftCard(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateGiftCardDto) {
    return this.marketing.createGiftCard(tenant.id, dto);
  }
}
