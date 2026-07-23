import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketplaceWinnerPromotionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function parseDurationHours(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const raw = String(value).trim();
    if (!raw) return undefined;

    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric;

    const match = raw.match(/(\d+(\.\d+)?)/);
    if (!match) return undefined;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDiscountPercent(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const raw = String(value).trim().replace(/%/g, '');
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export class CreateMarketplaceWinnerPromotionDto {
    @ApiProperty({
        enum: MarketplaceWinnerPromotionType,
        description: 'Winner promotion selected by the seller',
        example: MarketplaceWinnerPromotionType.DISCOUNT_10_PERCENT_24H,
    })
    @IsEnum(MarketplaceWinnerPromotionType)
    promoType!: MarketplaceWinnerPromotionType;

    @ApiPropertyOptional({
        description: 'Optional message to display with winner promotion',
        example: 'Thank you for voting! Enjoy 10% off our battle winner for 24 hours only.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;

    @ApiPropertyOptional({
        description: 'Discount percentage for DISCOUNT promotions (e.g. 10, 15, 25). Defaults to 10.',
        example: '10',
    })
    @IsOptional()
    @Transform(({ value }) => parseDiscountPercent(value))
    @IsNumber()
    @Min(1)
    @Max(90)
    discount?: number;

    @ApiPropertyOptional({
        description: 'Promotion duration in hours. Accepts 24 or "24 HOURS". Defaults to 24.',
        example: '24 HOURS',
    })
    @IsOptional()
    @Transform(({ value }) => parseDurationHours(value))
    @IsNumber()
    @Min(1)
    @Max(720)
    duration?: number;

    @ApiPropertyOptional({
        description: 'Alias for duration (hours).',
        example: 24,
    })
    @IsOptional()
    @Transform(({ value }) => parseDurationHours(value))
    @IsNumber()
    @Min(1)
    @Max(720)
    durationHours?: number;
}
