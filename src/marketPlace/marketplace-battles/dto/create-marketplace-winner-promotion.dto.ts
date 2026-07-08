import { ApiProperty } from '@nestjs/swagger';
import { MarketplaceWinnerPromotionType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateMarketplaceWinnerPromotionDto {
    @ApiProperty({
        enum: MarketplaceWinnerPromotionType,
        description: 'Winner promotion selected by the seller',
        example: MarketplaceWinnerPromotionType.DISCOUNT_10_PERCENT_24H,
    })
    @IsEnum(MarketplaceWinnerPromotionType)
    promoType!: MarketplaceWinnerPromotionType;
}
