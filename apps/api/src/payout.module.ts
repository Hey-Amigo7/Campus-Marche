import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';
import { WalletModule } from './wallet.module';

@Module({
  imports:     [WalletModule],
  controllers: [PayoutController],
  providers:   [PayoutService],
  exports:     [PayoutService],
})
export class PayoutModule {}
