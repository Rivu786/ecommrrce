import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController, OrdersAdminController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MarketingModule } from '../marketing/marketing.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    forwardRef(() => CartModule),
    InventoryModule,
    MarketingModule,
    forwardRef(() => WebhooksModule),
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
