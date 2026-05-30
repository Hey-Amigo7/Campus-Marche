import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { EventsAuthGuard } from './auth/events-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { ChatGateway } from './chat.gateway';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailService } from './email.service';
import { validateEnv } from './config/env.validation';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { RolesGuard } from './auth/roles.guard';
import { ReviewController } from './review.controller';
import { UploadController } from './upload.controller';
import { ReviewService } from './review.service';
import { SavedItemsController } from './saved-items.controller';
import { SavedItemsService } from './saved-items.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaService } from './prisma.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { SmsService } from './sms.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { UserController } from './user.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('THROTTLE_TTL'),
          limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as never,
        },
      }),
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminController,
    AppController,
    AuthController,
    BusinessController,
    ContactController,
    EventController,
    MessageController,
    NotificationController,
    OrderController,
    PaymentController,
    PayoutController,
    ProductController,
    WalletController,
    ReportController,
    ReviewController,
    SavedItemsController,
    SellerController,
    SubscriptionController,
    UploadController,
    UserController,
  ],
  providers: [
    // Apply ThrottlerGuard globally — every endpoint inherits the default limit.
    // Individual endpoints can override with @Throttle() or opt-out with @SkipThrottle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AdminAuthGuard,
    EventsAuthGuard,
    AdminService,
    AppService,
    AuthService,
    BusinessService,
    ChatGateway,
    ContactService,
    EmailService,
    EventService,
    MessageService,
    NotificationService,
    OrderService,
    PaymentService,
    PayoutService,
    PrismaService,
    WalletService,
    ProductService,
    Reflector,
    ReportService,
    ReviewService,
    RolesGuard,
    SavedItemsService,
    SellerService,
    SmsService,
    SubscriptionService,
  ],
})
export class AppModule {}
