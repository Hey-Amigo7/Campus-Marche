import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const ORDER_STATUSES = [
  'Awaiting payment',
  'Payment initiated',
  'In progress',
  'Out for delivery',
  'Delivered',
  'Releasing funds',
  'Completed',
  'Disputed',
  'Refunded',
  'Cancelled',
  'Payment failed',
] as const;

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

export class SetDeliveryDetailsDto {
  @ApiProperty({ example: 'Room 12, Block C, HTU Campus' })
  @IsString()
  deliveryAddress!: string;

  @ApiProperty({ example: '0244123456' })
  @IsString()
  deliveryPhone!: string;
}

export class AssignDeliveryPersonDto {
  @ApiProperty({ description: 'Email, phone number, or user ID — can be a registered user or an external contact' })
  @IsString()
  identifier!: string;

  @ApiPropertyOptional({ description: 'Display name for external delivery contacts (not required for registered users)' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 6.6026 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 0.4675 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 270 })
  @IsNumber()
  @IsOptional()
  heading?: number;

  @ApiPropertyOptional({ example: 15.5 })
  @IsNumber()
  @IsOptional()
  speed?: number;
}
