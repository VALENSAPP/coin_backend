import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ShippingOptions, WhoCanBuy } from '@prisma/client';

export class CreateMyclosetDto {
  @ApiProperty({ example: 'Graziela Closet' })
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: any }) => String(value || '').trim())
  shopName!: string;

  @ApiProperty({ example: 'grazielacloset' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'shopUsername can only contain letters, numbers, dots, underscores, and hyphens',
  })
  @Transform(({ value }: { value: any }) => String(value || '').trim().toLowerCase())
  shopUsername!: string;

  @ApiProperty({ required: false, example: 'Pre-loved luxury and daily fashion picks.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  description?: string;

  @ApiProperty({ required: false, example: 'Fashion' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  shopCategory?: string;

  @ApiProperty({ required: false, example: 'New York, NY' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  location?: string;

  @ApiProperty({ enum: WhoCanBuy, default: WhoCanBuy.Everyone })
  @IsEnum(WhoCanBuy)
  whoCanBuy!: WhoCanBuy;

  @ApiProperty({ required: false, example: 'stripe' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  paymentMethod?: string;

  @ApiProperty({ enum: ShippingOptions, default: ShippingOptions.ship_items })
  @IsEnum(ShippingOptions)
  shippingOptions!: ShippingOptions;

  @ApiProperty({ required: false, example: 'Returns accepted within 7 days if item is unused.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: any }) => (value ? String(value).trim() : undefined))
  returnPolicy?: string;
}
