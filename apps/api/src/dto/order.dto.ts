import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

const ORDER_STATUSES = ['Payment pending', 'In progress', 'Completed', 'Cancelled'] as const;

export class CreateOrderDto {
  @ApiProperty({ description: 'ID of the product to purchase' })
  @IsString()
  productId!: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsString()
  @IsIn(ORDER_STATUSES)
  status!: string;
}
