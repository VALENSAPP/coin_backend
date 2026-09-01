import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SubscriptionStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  STOP = 'STOP',
}

export enum SubscriptionSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_HIGH = 'price_high',
  PRICE_LOW = 'price_low',
  EXPIRY_SOON = 'expiry_soon',
}

export class GetMySubscriptionsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by subscription status: ALL, ACTIVE, EXPIRED, STOP',
    enum: SubscriptionStatusFilter,
    default: SubscriptionStatusFilter.ALL,
    example: SubscriptionStatusFilter.ALL,
  })
  @IsEnum(SubscriptionStatusFilter)
  @IsOptional()
  status?: SubscriptionStatusFilter = SubscriptionStatusFilter.ALL;

  @ApiPropertyOptional({
    description: 'Search creator by username, display name, or email',
    example: 'creator_name',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order for subscriptions list',
    enum: SubscriptionSortBy,
    default: SubscriptionSortBy.NEWEST,
    example: SubscriptionSortBy.NEWEST,
  })
  @IsEnum(SubscriptionSortBy)
  @IsOptional()
  sortBy?: SubscriptionSortBy = SubscriptionSortBy.NEWEST;
}
