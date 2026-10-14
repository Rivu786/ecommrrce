import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PermissionGuard } from './auth/permission.guard';
import { PlatformModule } from './platform/platform.module';
import { StaffModule } from './staff/staff.module';
import { ProvidersModule } from './providers/providers.module';
import { BillingModule } from './billing/billing.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { CustomersModule } from './customers/customers.module';
import { MarketingModule } from './marketing/marketing.module';
import { ReturnsModule } from './returns/returns.module';
import { CmsModule } from './cms/cms.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistsModule } from './wishlists/wishlists.module';
import { DriverModule } from './driver/driver.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { BulkModule } from './bulk/bulk.module';
import { MediaModule } from './media/media.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { B2bModule } from './b2b/b2b.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { QrModule } from './qr/qr.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    AuditModule,
    StorageModule,
    QrModule,
    WebhooksModule,
    HealthModule,
    CatalogModule,
    InventoryModule,
    MarketingModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    CustomersModule,
    ReturnsModule,
    CmsModule,
    ReviewsModule,
    WishlistsModule,
    DriverModule,
    AnalyticsModule,
    SettingsModule,
    BulkModule,
    MediaModule,
    MarketplaceModule,
    B2bModule,
    SubscriptionsModule,
    JobsModule,
    PlatformModule,
    StaffModule,
    ProvidersModule,
    BillingModule,
  ],
  providers: [
    TenantMiddleware,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'api/v1/health', method: RequestMethod.ALL },
        { path: 'uploads/(.*)', method: RequestMethod.ALL },
        { path: 'uploads', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
