import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
