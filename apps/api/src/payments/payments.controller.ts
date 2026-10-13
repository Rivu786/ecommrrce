import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { RoleCode } from '@omnicommerce/shared';
import { PaymentsService } from './payments.service';
import { Public, Roles, RequirePermissions } from '../common/decorators/auth.decorators';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequestTenant,
} from '../common/decorators/current.decorators';

class VerifySubmitDto {
  @IsString()
  orderPaymentReference!: string;
  @IsString()
  utr!: string;
  @IsOptional()
  @IsString()
  payerBankName?: string;
  @IsOptional()
  @IsString()
  senderAccount?: string;
  @IsOptional()
  @IsString()
  screenshotUrl?: string;
}

class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('payments')
@ApiHeader({ name: 'X-Tenant-ID', required: true })
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('verify-submit')
  verifySubmit(@CurrentTenant() tenant: RequestTenant, @Body() dto: VerifySubmitDto) {
    return this.payments.verifySubmit(tenant.id, dto);
  }
}

@ApiTags('admin-payments')
@ApiBearerAuth()
@Controller('admin/payments')
@Roles(RoleCode.TENANT_ADMIN, RoleCode.STORE_MANAGER, RoleCode.PAYMENT_VERIFIER)
@RequirePermissions('payments.verify_qr')
@Throttle({ default: { limit: 40, ttl: 60_000 } })
export class PaymentsAdminController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('pending')
  listPending(@CurrentTenant() tenant: RequestTenant) {
    return this.payments.listPending(tenant.id);
  }

  @Post(':id/confirm')
  confirm(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.payments.confirm(tenant.id, id, user.id);
  }

  @Post(':id/reject')
  reject(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectDto,
  ) {
    return this.payments.reject(tenant.id, id, user.id, dto.reason);
  }
}
