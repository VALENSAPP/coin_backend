import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { WhoCanBuy } from '@prisma/client';

export class EditMarketplaceBattleQuestionDto {
    @ApiPropertyOptional({
        description: 'Updated shop battle title',
        example: 'Summer Style Battle',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    @MaxLength(150)
    title?: string;

    @ApiPropertyOptional({
        description: 'Updated shop battle question',
        example: 'Which product has better style for this season?',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    @MaxLength(500)
    question?: string;

    @ApiPropertyOptional({
        description: 'Updated shop battle description',
        example: 'Choose your favorite product for summer',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({
        description: 'Updated category',
        example: 'Fashion',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    @MaxLength(120)
    category?: string;

    @ApiPropertyOptional({
        enum: WhoCanBuy,
        description: 'Who can view this battle in public APIs.',
        example: WhoCanBuy.Everyone,
    })
    @IsOptional()
    @IsEnum(WhoCanBuy)
    visibility?: WhoCanBuy;

    @ApiPropertyOptional({
        enum: WhoCanBuy,
        description: 'Who can vote in this battle.',
        example: WhoCanBuy.Everyone,
    })
    @IsOptional()
    @IsEnum(WhoCanBuy)
    whoCanVote?: WhoCanBuy;

    @ApiPropertyOptional({
        description: 'If true, battle can be shared to feed according to product flow.',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    shareToFeed?: boolean;

    @ApiPropertyOptional({
        type: [String],
        minItems: 2,
        maxItems: 2,
        description: 'Updated shop battle product IDs (array of exactly 2 product UUIDs)',
        example: [
            '11111111-1111-4111-8111-111111111111',
            '22222222-2222-4222-8222-222222222222',
        ],
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    productIds?: string[];

    @ApiPropertyOptional({
        description: 'Updated battle end time in ISO 8601 format.',
        example: '2026-07-11T10:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    endAt?: string;
}
