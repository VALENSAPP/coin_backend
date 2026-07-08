import { ApiProperty } from '@nestjs/swagger';
import { MarketplaceWinnerPromotionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMarketplaceWinnerPromotionDto {
    @ApiProperty({
        enum: MarketplaceWinnerPromotionType,
        description: 'Winner promotion selected by the seller',
        example: MarketplaceWinnerPromotionType.DISCOUNT_10_PERCENT_24H,
    })
    @IsEnum(MarketplaceWinnerPromotionType)
    promoType!: MarketplaceWinnerPromotionType;

    @ApiProperty({
        description: 'Optional message to display with winner promotion',
        example: 'Winner pick! 10% off for the next 24 hours.',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;
}
