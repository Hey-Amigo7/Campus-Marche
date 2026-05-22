import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpsertBusinessDto {
  @ApiProperty({ example: 'Ama Campus Services' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ enum: ['Student business', 'Teacher service', 'Local vendor'] })
  @IsString()
  @IsIn(['Student business', 'Teacher service', 'Local vendor'])
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 600)
  description?: string;

  @ApiProperty({ example: 'Ho Technical University / Ho' })
  @IsString()
  @Length(2, 120)
  location!: string;

  @ApiPropertyOptional({ example: '+233 50 000 0000' })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  @ApiPropertyOptional({ enum: ['mtn', 'vod', 'tgo'], description: 'MoMo provider for seller payouts' })
  @IsOptional()
  @IsString()
  momoProvider?: string;

  @ApiPropertyOptional({ example: '0244123456', description: 'MoMo phone for seller payouts' })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  momoPhone?: string;
}
