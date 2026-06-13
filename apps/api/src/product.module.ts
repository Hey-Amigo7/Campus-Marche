import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { AdminModule } from './admin.module';
import { SubscriptionModule } from './subscription.module';

@Module({
  imports:     [AdminModule, SubscriptionModule],
  controllers: [ProductController],
  providers:   [ProductService],
})
export class ProductModule {}
