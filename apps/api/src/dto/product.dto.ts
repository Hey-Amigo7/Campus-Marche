import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  description?: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 40)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  condition?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 120)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  location!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  imageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 80)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  category?: string;

  @ApiPropertyOptional({ enum: ['product', 'service'] })
  @IsOptional()
  @IsIn(['product', 'service'])
  listingType?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 40)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  imageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 80)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  category?: string;

  @ApiPropertyOptional({ enum: ['product', 'service'] })
  @IsOptional()
  @IsIn(['product', 'service'])
  listingType?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
