import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

export const CLOSET_MARKETPLACE_BATTLE_SORT_FIELDS = [
    'publishedAt',
    'createdAt',
    'startAt',
    'endAt',
    'totalVotes',
    'totalComments',
] as const;

export const CLOSET_MARKETPLACE_BATTLE_PUBLIC_STATUSES = [
    'SCHEDULED',
    'LIVE',
    'COMPLETED',
] as const;

export type ClosetMarketplaceBattleSortField =
    (typeof CLOSET_MARKETPLACE_BATTLE_SORT_FIELDS)[number];

export type ClosetMarketplaceBattlePublicStatus =
    (typeof CLOSET_MARKETPLACE_BATTLE_PUBLIC_STATUSES)[number];

export class ClosetMarketplaceBattlesQueryDto {
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
        description: 'Public closet battle status filter',
        enum: CLOSET_MARKETPLACE_BATTLE_PUBLIC_STATUSES,
    })
    @Transform(({ value }: { value: any }) =>
        typeof value === 'string' ? value.toUpperCase() : value,
    )
    @IsOptional()
    @IsIn(CLOSET_MARKETPLACE_BATTLE_PUBLIC_STATUSES)
    status?: ClosetMarketplaceBattlePublicStatus;

    @ApiPropertyOptional({
        description: 'Sort field',
        enum: CLOSET_MARKETPLACE_BATTLE_SORT_FIELDS,
        default: 'publishedAt',
    })
    @IsOptional()
    @IsIn(CLOSET_MARKETPLACE_BATTLE_SORT_FIELDS)
    sortBy?: ClosetMarketplaceBattleSortField = 'publishedAt';

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
