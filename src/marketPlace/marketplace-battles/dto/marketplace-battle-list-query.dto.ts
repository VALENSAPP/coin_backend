import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketplaceBattleStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export const MARKETPLACE_BATTLE_SORT_FIELDS = [
    'createdAt',
    'updatedAt',
    'startAt',
    'endAt',
    'totalVotes',
    'totalComments',
] as const;

export type MarketplaceBattleSortField =
    (typeof MARKETPLACE_BATTLE_SORT_FIELDS)[number];

export class MarketplaceBattleListQueryDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Items per page',
        example: 10,
        default: 10,
        maximum: 100,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Filter by battle status',
        enum: MarketplaceBattleStatus,
        example: MarketplaceBattleStatus.DRAFT,
    })
    @Transform(({ value }: { value: any }) =>
        typeof value === 'string' ? value.toUpperCase() : value,
    )
    @IsEnum(MarketplaceBattleStatus)
    @IsOptional()
    status?: MarketplaceBattleStatus;

    @ApiPropertyOptional({
        description: 'Filter by category (case-insensitive exact match)',
        example: 'Fashion',
    })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    category?: string;

    @ApiPropertyOptional({
        description: 'Search text in title and description',
        example: 'summer',
    })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    search?: string;

    @ApiPropertyOptional({
        description: 'Sort field',
        enum: MARKETPLACE_BATTLE_SORT_FIELDS,
        default: 'createdAt',
    })
    @IsOptional()
    @IsIn(MARKETPLACE_BATTLE_SORT_FIELDS)
    sortBy?: MarketplaceBattleSortField = 'createdAt';

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ['asc', 'desc'],
        default: 'desc',
    })
    @Transform(({ value }: { value: any }) =>
        typeof value === 'string' ? value.toLowerCase() : value,
    )
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
}
