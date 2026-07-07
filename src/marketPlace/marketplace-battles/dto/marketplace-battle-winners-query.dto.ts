import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const MARKETPLACE_BATTLE_WINNERS_SORT_FIELDS = [
    'completedAt',
    'createdAt',
    'totalVotes',
    'totalComments',
] as const;

export type MarketplaceBattleWinnersSortField =
    (typeof MARKETPLACE_BATTLE_WINNERS_SORT_FIELDS)[number];

export class MarketplaceBattleWinnersQueryDto {
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
        description:
            'Sort field for unique winner products. completedAt => latestWinAt, createdAt => latest battle createdAt, totalVotes => totalVotesAcrossWins, totalComments => totalCommentsAcrossWins.',
        enum: MARKETPLACE_BATTLE_WINNERS_SORT_FIELDS,
        default: 'completedAt',
    })
    @IsOptional()
    @IsIn(MARKETPLACE_BATTLE_WINNERS_SORT_FIELDS)
    sortBy?: MarketplaceBattleWinnersSortField = 'completedAt';

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
