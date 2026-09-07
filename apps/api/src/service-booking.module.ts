import { Module } from '@nestjs/common';
import { ServiceBookingController } from './service-booking.controller';
import { ServiceBookingService } from './service-booking.service';
import { PaymentModule } from './payment.module';

@Module({
  imports:     [PaymentModule],
  controllers: [ServiceBookingController],
  providers:   [ServiceBookingService],
  exports:     [ServiceBookingService],
})
export class ServiceBookingModule {}
