import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentModule } from './payment.module';

@Module({
  imports:     [PaymentModule],
  controllers: [OrderController],
  providers:   [OrderService],
})
export class OrderModule {}
