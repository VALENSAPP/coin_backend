import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum MarketPlaceOverviewRange {
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
}

export class MarketPlaceOverviewFilterDto {
    @ApiPropertyOptional({
        enum: MarketPlaceOverviewRange,
        example: MarketPlaceOverviewRange.WEEKLY,
        description: 'weekly returns last 7 days, monthly returns last 30 days',
    })
    @IsOptional()
    @IsEnum(MarketPlaceOverviewRange)
    range?: MarketPlaceOverviewRange;
}
