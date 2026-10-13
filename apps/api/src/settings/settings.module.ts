import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController, ShippingPublicController } from './settings.controller';

@Module({
  controllers: [SettingsController, ShippingPublicController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
