import { Global, Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

/**
 * Global notification module.
 * NotificationService is available for injection everywhere
 * without explicit module imports.
 */
@Global()
@Module({
  controllers: [NotificationController],
  providers:   [NotificationService],
  exports:     [NotificationService],
})
export class NotificationModule {}
