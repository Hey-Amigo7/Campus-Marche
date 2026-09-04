import { Module } from '@nestjs/common';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaymentModule } from './payment.module';
import { AuthModule } from './auth.module';
import { EventsAuthGuard } from './auth/events-auth.guard';

@Module({
  imports:     [PaymentModule, AuthModule],
  controllers: [AdminController, AdminAuthController],
  providers:   [AdminService, EventsAuthGuard],
  exports:     [AdminService],
})
export class AdminModule {}
