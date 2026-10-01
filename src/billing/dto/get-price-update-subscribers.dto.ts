import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum PriceUpdateResponseStatusFilter {
  ALL = 'ALL',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
}

export enum PriceUpdateSubscriberSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  PRICE_HIGH = 'price_high',
  PRICE_LOW = 'price_low',
  EXPIRY_SOON = 'expiry_soon',
}

export class GetPriceUpdateSubscribersQueryDto {
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
    description: 'Filter by price response status: ALL, ACCEPTED, DECLINED, PENDING',
    enum: PriceUpdateResponseStatusFilter,
    default: PriceUpdateResponseStatusFilter.ALL,
    example: PriceUpdateResponseStatusFilter.ALL,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toUpperCase().trim();
      if (v === 'ACCEPT' || v === 'ACCEPTED') return PriceUpdateResponseStatusFilter.ACCEPTED;
      if (v === 'DECLINE' || v === 'DECLINED' || v === 'CANCEL' || v === 'CANCELED' || v === 'CANCELLED' || v === 'STOP') {
        return PriceUpdateResponseStatusFilter.DECLINED;
      }
      if (v === 'PENDING') return PriceUpdateResponseStatusFilter.PENDING;
    }
    return value;
  })
  @IsEnum(PriceUpdateResponseStatusFilter)
  @IsOptional()
  status?: PriceUpdateResponseStatusFilter = PriceUpdateResponseStatusFilter.ALL;

  @ApiPropertyOptional({
    description: 'Alternative parameter for status: ALL, ACCEPTED, DECLINED, PENDING',
    enum: PriceUpdateResponseStatusFilter,
    required: false,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toUpperCase().trim();
      if (v === 'ACCEPT' || v === 'ACCEPTED') return PriceUpdateResponseStatusFilter.ACCEPTED;
      if (v === 'DECLINE' || v === 'DECLINED' || v === 'CANCEL' || v === 'CANCELED' || v === 'CANCELLED' || v === 'STOP') {
        return PriceUpdateResponseStatusFilter.DECLINED;
      }
      if (v === 'PENDING') return PriceUpdateResponseStatusFilter.PENDING;
    }
    return value;
  })
  @IsEnum(PriceUpdateResponseStatusFilter)
  @IsOptional()
  responseStatus?: PriceUpdateResponseStatusFilter;

  @ApiPropertyOptional({
    description: 'Search subscriber by username, display name, or email',
    example: 'alex',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order for subscriber list',
    enum: PriceUpdateSubscriberSortBy,
    default: PriceUpdateSubscriberSortBy.NEWEST,
    example: PriceUpdateSubscriberSortBy.NEWEST,
  })
  @IsEnum(PriceUpdateSubscriberSortBy)
  @IsOptional()
  sortBy?: PriceUpdateSubscriberSortBy = PriceUpdateSubscriberSortBy.NEWEST;
}
