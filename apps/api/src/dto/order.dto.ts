import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

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

export class SetDeliveryDetailsDto {
  @ApiProperty({ example: 'Room 12, Block C, HTU Campus' })
  @IsString()
  deliveryAddress!: string;

  @ApiProperty({ example: '0244123456' })
  @IsString()
  deliveryPhone!: string;
}

export class AssignDeliveryPersonDto {
  @ApiProperty({ description: 'User ID of the delivery person' })
  @IsString()
  deliveryPersonId!: string;
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
