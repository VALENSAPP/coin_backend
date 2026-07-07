import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export const MARKETPLACE_BATTLE_EXPLORE_SORT_FIELDS = [
    'publishedAt',
    'createdAt',
    'endAt',
    'totalVotes',
    'totalComments',
] as const;

export type MarketplaceBattleExploreSortField =
    (typeof MARKETPLACE_BATTLE_EXPLORE_SORT_FIELDS)[number];

export class MarketplaceBattleExploreQueryDto {
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

    @ApiPropertyOptional({ description: 'Filter by category', example: 'Fashion' })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    category?: string;

    @ApiPropertyOptional({ description: 'Search by title/description', example: 'summer' })
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
        enum: MARKETPLACE_BATTLE_EXPLORE_SORT_FIELDS,
        default: 'publishedAt',
    })
    @IsOptional()
    @IsIn(MARKETPLACE_BATTLE_EXPLORE_SORT_FIELDS)
    sortBy?: MarketplaceBattleExploreSortField = 'publishedAt';

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
