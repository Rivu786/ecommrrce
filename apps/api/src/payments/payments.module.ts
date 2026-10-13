import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, PaymentsAdminController } from './payments.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { MarketingModule } from '../marketing/marketing.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [InventoryModule, MarketingModule, forwardRef(() => WebhooksModule)],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
