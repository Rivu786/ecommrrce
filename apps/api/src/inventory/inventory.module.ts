import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryAdminController } from './inventory.controller';

@Module({
  controllers: [InventoryAdminController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
