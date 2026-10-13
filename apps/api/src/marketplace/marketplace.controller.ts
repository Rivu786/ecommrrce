import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '@omnicommerce/shared';
import { MarketplaceService } from './marketplace.service';
import { Roles } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

class CreateVendorDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsNumber() commissionPct?: number;
}

class KycDto {
  @IsObject() documentsJson!: object;
}

class PayoutDto {
  @IsString() vendorId!: string;
  @IsNumber() amount!: number;
}

@ApiTags('marketplace')
@ApiBearerAuth()
@Controller('admin/marketplace')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('vendors')
  list(@CurrentTenant() tenant: RequestTenant) {
    return this.marketplace.listVendors(tenant.id);
  }

  @Post('vendors')
  create(@CurrentTenant() tenant: RequestTenant, @Body() dto: CreateVendorDto) {
    return this.marketplace.createVendor(tenant.id, dto);
  }

  @Patch('vendors/:id')
  update(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.marketplace.updateVendor(tenant.id, id, dto);
  }

  @Delete('vendors/:id')
  delete(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.marketplace.deleteVendor(tenant.id, id);
  }

  @Post('vendors/:id/kyc')
  submitKyc(
    @CurrentTenant() tenant: RequestTenant,
    @Param('id') id: string,
    @Body() dto: KycDto,
  ) {
    return this.marketplace.submitKyc(tenant.id, id, dto.documentsJson);
  }

  @Post('vendors/:id/kyc/approve')
  approveKyc(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.marketplace.reviewKyc(tenant.id, id, 'APPROVED');
  }

  @Post('vendors/:id/kyc/reject')
  rejectKyc(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.marketplace.reviewKyc(tenant.id, id, 'REJECTED');
  }

  @Get('payouts')
  payouts(@CurrentTenant() tenant: RequestTenant, @Query('vendorId') vendorId?: string) {
    return this.marketplace.listPayouts(tenant.id, vendorId);
  }

  @Post('payouts')
  createPayout(@CurrentTenant() tenant: RequestTenant, @Body() dto: PayoutDto) {
    return this.marketplace.createPayout(tenant.id, dto.vendorId, dto.amount);
  }

  @Post('payouts/:id/paid')
  markPaid(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.marketplace.markPayoutPaid(tenant.id, id);
  }
}
