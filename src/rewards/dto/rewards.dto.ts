import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RewardCategoryEnum {
  AIRLINE_MILES = 'AIRLINE_MILES',
  HOTEL_POINTS = 'HOTEL_POINTS',
  TRAVEL_BOOKING = 'TRAVEL_BOOKING',
  GIFT_CARD = 'GIFT_CARD',
  SHOPPING = 'SHOPPING',
  EXPERIENCES = 'EXPERIENCES',
  MISSION_POSTS = 'MISSION_POSTS',
}

export enum RewardProviderEnum {
  MERIT = 'MERIT',
  POINTS_COM = 'POINTS_COM',
  EXPEDIA = 'EXPEDIA',
  INTERNAL = 'INTERNAL',
}

export class GetCatalogQueryDto {
  @ApiPropertyOptional({ enum: RewardCategoryEnum, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(RewardCategoryEnum)
  category?: RewardCategoryEnum;

  @ApiPropertyOptional({ enum: RewardProviderEnum, description: 'Filter by provider' })
  @IsOptional()
  @IsEnum(RewardProviderEnum)
  provider?: RewardProviderEnum;
}

export class CalculateQuoteDto {
  @ApiProperty({ enum: RewardCategoryEnum, example: RewardCategoryEnum.AIRLINE_MILES })
  @IsNotEmpty()
  @IsEnum(RewardCategoryEnum)
  category: RewardCategoryEnum;

  @ApiProperty({ enum: RewardProviderEnum, example: RewardProviderEnum.POINTS_COM })
  @IsNotEmpty()
  @IsEnum(RewardProviderEnum)
  provider: RewardProviderEnum;

  @ApiProperty({ example: 'AEROPLAN', description: 'Program code (e.g., AEROPLAN, FLYING_BLUE, EXPEDIA_HOTEL, AMAZON_GC)' })
  @IsNotEmpty()
  @IsString()
  programCode: string;

  @ApiProperty({ example: 5000, description: 'Number of Valens Points to exchange' })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  valensPoints: number;
}

export class LinkLoyaltyAccountDto {
  @ApiProperty({ enum: RewardProviderEnum, example: RewardProviderEnum.POINTS_COM })
  @IsNotEmpty()
  @IsEnum(RewardProviderEnum)
  provider: RewardProviderEnum;

  @ApiProperty({ example: 'AEROPLAN', description: 'Partner Program Identifier' })
  @IsNotEmpty()
  @IsString()
  programCode: string;

  @ApiProperty({ example: 'Air Canada Aeroplan', description: 'Human-readable program name' })
  @IsNotEmpty()
  @IsString()
  programName: string;

  @ApiProperty({ example: 'AC123456789', description: 'Frequent flyer / loyalty account number' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Name on loyalty account' })
  @IsOptional()
  @IsString()
  accountName?: string;
}

export class RedeemPointsDto {
  @ApiProperty({ enum: RewardCategoryEnum, example: RewardCategoryEnum.AIRLINE_MILES })
  @IsNotEmpty()
  @IsEnum(RewardCategoryEnum)
  category: RewardCategoryEnum;

  @ApiProperty({ enum: RewardProviderEnum, example: RewardProviderEnum.POINTS_COM })
  @IsNotEmpty()
  @IsEnum(RewardProviderEnum)
  provider: RewardProviderEnum;

  @ApiProperty({ example: 'AEROPLAN', description: 'Partner program code' })
  @IsNotEmpty()
  @IsString()
  programCode: string;

  @ApiProperty({ example: 5000, description: 'Number of Valens Points to redeem' })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  valensPoints: number;

  @ApiProperty({ example: 4000, description: 'Expected reward amount (miles / points / USD value) based on quote' })
  @IsNotEmpty()
  @IsNumber()
  expectedRewardAmount: number;

  @ApiPropertyOptional({ example: 'uuid-of-linked-account', description: 'ID of pre-linked UserLoyaltyAccount (optional if passing accountNumber directly)' })
  @IsOptional()
  @IsString()
  linkedAccountId?: string;

  @ApiPropertyOptional({ example: 'AC123456789', description: 'Direct account or recipient email/number if not using pre-linked account' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Direct recipient/account holder name' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ example: 'redeem-client-idempotency-123456', description: 'Unique idempotency key to prevent double redemption' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ description: 'Additional metadata such as hotel stay dates, room type, gift card recipient email, etc.', example: { roomType: 'Deluxe Suite', checkIn: '2026-10-01' } })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RedemptionHistoryQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: RewardCategoryEnum })
  @IsOptional()
  @IsEnum(RewardCategoryEnum)
  category?: RewardCategoryEnum;

  @ApiPropertyOptional({ enum: RewardProviderEnum })
  @IsOptional()
  @IsEnum(RewardProviderEnum)
  provider?: RewardProviderEnum;
}
