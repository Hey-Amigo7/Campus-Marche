import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
// ── Global infrastructure ─────────────────────────────────────────────────────
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth.module';         // JWT + guards + EmailService
import { ChatModule } from './chat.module';          // ChatGateway (WebSocket)
import { NotificationModule } from './notification.module';
// ── Feature modules ───────────────────────────────────────────────────────────
import { AdminModule } from './admin.module';
import { BusinessModule } from './business.module';
import { ContactModule } from './contact.module';
import { EventModule } from './event.module';
import { MessageModule } from './message.module';
import { OrderModule } from './order.module';
import { PaymentModule } from './payment.module';   // imports WalletModule + PayoutModule
import { PayoutModule } from './payout.module';     // imports WalletModule
import { ProductModule } from './product.module';   // imports AdminModule + SubscriptionModule
import { ReportModule } from './report.module';
import { ReviewModule } from './review.module';
import { SavedItemsModule } from './saved-items.module';
import { SellerModule } from './seller.module';
import { SubscriptionModule } from './subscription.module';
import { UploadModule } from './upload.module';
import { UserModule } from './user.module';
import { WalletModule } from './wallet.module';

@Module({
  imports: [
    // ── Core configuration ───────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl:   config.getOrThrow<number>('THROTTLE_TTL'),
          limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    // ── Global singletons (available in every module without explicit import) ─
    PrismaModule,
    AuthModule,
    ChatModule,
    NotificationModule,
    // ── Feature modules ──────────────────────────────────────────────────────
    AdminModule,
    BusinessModule,
    ContactModule,
    EventModule,
    MessageModule,
    OrderModule,
    PaymentModule,
    PayoutModule,
    ProductModule,
    ReportModule,
    ReviewModule,
    SavedItemsModule,
    SellerModule,
    SubscriptionModule,
    UploadModule,
    UserModule,
    WalletModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AppService,
    Reflector,
  ],
})
export class AppModule {}
