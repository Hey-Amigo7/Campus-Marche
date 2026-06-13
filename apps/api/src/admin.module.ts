import { Module } from '@nestjs/common';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventsAuthGuard } from './auth/events-auth.guard';

@Module({
  controllers: [AdminController, AdminAuthController],
  providers:   [AdminService, EventsAuthGuard],
  exports:     [AdminService],
})
export class AdminModule {}
