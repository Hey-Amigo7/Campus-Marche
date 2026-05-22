import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  reportedUserId?: string;

  @IsString()
  @IsOptional()
  productId?: string;
}
