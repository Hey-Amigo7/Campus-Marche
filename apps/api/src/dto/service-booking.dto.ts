import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateServiceBookingDto {
  @ApiProperty({ description: 'ID of the service product' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Requested date/time in ISO 8601 format', example: '2026-09-10T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: 'Optional notes for the seller' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeclineBookingDto {
  @ApiPropertyOptional({ description: 'Reason for declining' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Reason for cancelling' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpsertAvailabilityDto {
  @ApiPropertyOptional({ example: 60, description: 'Session duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMin?: number;

  @ApiPropertyOptional({ enum: ['session', 'hour'], example: 'session' })
  @IsOptional()
  @IsIn(['session', 'hour'])
  priceType?: string;

  @ApiPropertyOptional({ example: '1,2,3,4,5', description: 'Comma-separated day numbers (0=Sun … 6=Sat)' })
  @IsOptional()
  @IsString()
  availableDays?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxBookingsPerDay?: number;

  @ApiPropertyOptional({ example: 24, description: 'Minimum hours of notice required before booking' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  advanceNoticeHours?: number;
}
