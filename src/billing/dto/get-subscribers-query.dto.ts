import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SubscriberStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  STOP = 'STOP',
}

export enum SubscriberSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_HIGH = 'price_high',
  PRICE_LOW = 'price_low',
  EXPIRY_SOON = 'expiry_soon',
}

export class GetSubscribersQueryDto {
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
    description: 'Filter by subscriber status: ALL, ACTIVE, EXPIRED, STOP',
    enum: SubscriberStatusFilter,
    default: SubscriberStatusFilter.ALL,
    example: SubscriberStatusFilter.ALL,
  })
  @IsEnum(SubscriberStatusFilter)
  @IsOptional()
  status?: SubscriberStatusFilter = SubscriberStatusFilter.ALL;

  @ApiPropertyOptional({
    description: 'Search subscriber by username, display name, or email',
    example: 'alex',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order for subscribers list',
    enum: SubscriberSortBy,
    default: SubscriberSortBy.NEWEST,
    example: SubscriberSortBy.NEWEST,
  })
  @IsEnum(SubscriberSortBy)
  @IsOptional()
  sortBy?: SubscriberSortBy = SubscriberSortBy.NEWEST;
}
