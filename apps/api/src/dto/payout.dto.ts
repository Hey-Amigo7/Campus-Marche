import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class RequestPayoutDto {
  @ApiProperty({ description: 'Amount in GHS to withdraw (must not exceed available balance)' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: ['MTN_MOMO', 'TELECEL_CASH', 'AIRTELTIGO_MONEY', 'BANK_TRANSFER'] })
  @IsEnum(['MTN_MOMO', 'TELECEL_CASH', 'AIRTELTIGO_MONEY', 'BANK_TRANSFER'])
  payoutMethod!: 'MTN_MOMO' | 'TELECEL_CASH' | 'AIRTELTIGO_MONEY' | 'BANK_TRANSFER';

  @ApiPropertyOptional({ description: 'Override MoMo phone (defaults to business profile MoMo phone)' })
  @IsOptional()
  @IsString()
  @Matches(/^(0[2-9][0-9]{8}|233[2-9][0-9]{8})$/, { message: 'Phone must be a valid Ghana number (0XXXXXXXXX or 233XXXXXXXXX)' })
  momoPhone?: string;
}

export class ApprovePayoutDto {
  @ApiPropertyOptional({ description: 'Admin note' })
  @IsOptional()
  @IsString()
  note?: string;
}
