import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class EditMarketplaceBattleQuestionDto {
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
        type: [String],
        minItems: 2,
        maxItems: 2,
        description: 'Updated shop battle options (array of exactly 2 product UUIDs)',
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
    options?: string[];

    @ApiPropertyOptional({
        type: [String],
        minItems: 2,
        maxItems: 2,
        description: 'Alias for options: updated shop battle product IDs (array of exactly 2 product UUIDs)',
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
}
