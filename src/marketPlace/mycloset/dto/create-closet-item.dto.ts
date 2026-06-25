import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ClosetItemCondition, ShippingOptions } from '@prisma/client';

export class CreateClosetItemDto {
  @ApiProperty({ required: false, example: 'Vintage denim jacket' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  name?: string;

  @ApiProperty({ example: 'Jackets' })
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: any }) => String(value || '').trim())
  category!: string;

  @ApiProperty({ required: false, example: 'Levi' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  brand?: string;

  @ApiProperty({ enum: ClosetItemCondition, example: ClosetItemCondition.Good_condition })
  @IsEnum(ClosetItemCondition)
  condition!: ClosetItemCondition;

  @ApiProperty({ required: false, example: 'Lightly used, no visible defects.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  description?: string;

  @ApiProperty({ example: 49.99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ required: false, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({ enum: ShippingOptions, example: ShippingOptions.ship_items })
  @IsOptional()
  @IsEnum(ShippingOptions)
  shippingOption?: ShippingOptions;

  @ApiProperty({ required: false, enum: ShippingOptions, description: 'Accepted for frontend typo compatibility.' })
  @IsOptional()
  @IsEnum(ShippingOptions)
  ahippingOption?: ShippingOptions;

  @ApiProperty({ required: false, example: '3-5 business days' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  estimateShippingTime?: string;

  @ApiProperty({ required: false, example: 'Returns accepted within 7 days.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  returnPolicy?: string;
}
