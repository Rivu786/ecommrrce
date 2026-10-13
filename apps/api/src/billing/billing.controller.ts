import { Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentTenant, RequestTenant } from '../common/decorators/current.decorators';

@ApiTags('billing')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-ID' })
@Controller('admin/billing')
@Throttle({ default: { limit: 40, ttl: 60_000 } })
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('orders/:orderId/invoice')
  @RequirePermissions('billing.invoice')
  invoice(@CurrentTenant() tenant: RequestTenant, @Param('orderId') orderId: string) {
    return this.billing.createInvoice(tenant.id, orderId);
  }

  @Post('orders/:orderId/receipt')
  @RequirePermissions('billing.receipt')
  receipt(@CurrentTenant() tenant: RequestTenant, @Param('orderId') orderId: string) {
    return this.billing.createReceipt(tenant.id, orderId);
  }
}
