import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WalletModule } from './wallet.module';
import { PayoutModule } from './payout.module';

@Module({
  imports:     [WalletModule, PayoutModule],
  controllers: [PaymentController],
  providers:   [PaymentService],
  exports:     [PaymentService],
})
export class PaymentModule {}
