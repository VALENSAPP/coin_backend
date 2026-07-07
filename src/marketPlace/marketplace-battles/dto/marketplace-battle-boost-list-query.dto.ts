import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketplaceBattleBoostStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const MARKETPLACE_BATTLE_BOOST_SORT_FIELDS = [
    'createdAt',
    'startAt',
    'endAt',
    'activatedAt',
] as const;

export type MarketplaceBattleBoostSortField =
    (typeof MARKETPLACE_BATTLE_BOOST_SORT_FIELDS)[number];

export class MarketplaceBattleBoostListQueryDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10, maximum: 100 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({ enum: MarketplaceBattleBoostStatus })
    @Transform(({ value }: { value: any }) =>
        typeof value === 'string' ? value.toUpperCase() : value,
    )
    @IsOptional()
    @IsEnum(MarketplaceBattleBoostStatus)
    status?: MarketplaceBattleBoostStatus;

    @ApiPropertyOptional({ description: 'Filter by battle id' })
    @IsOptional()
    @IsUUID('4')
    battleId?: string;

    @ApiPropertyOptional({ enum: MARKETPLACE_BATTLE_BOOST_SORT_FIELDS, default: 'createdAt' })
    @IsOptional()
    @IsIn(MARKETPLACE_BATTLE_BOOST_SORT_FIELDS)
    sortBy?: MarketplaceBattleBoostSortField = 'createdAt';

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
    @Transform(({ value }: { value: any }) =>
        typeof value === 'string' ? value.toLowerCase() : value,
    )
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
}
