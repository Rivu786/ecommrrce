import { Module } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { MarketingAdminController } from './marketing.controller';

@Module({
  controllers: [MarketingAdminController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
