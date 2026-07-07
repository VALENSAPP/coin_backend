import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class UpdateMarketplaceBattleDto {
    @ApiPropertyOptional({ example: 'Summer Style Face-Off' })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) =>
        value === undefined || value === null ? undefined : String(value).trim(),
    )
    @IsNotEmpty()
    @MaxLength(150)
    title?: string;

    @ApiPropertyOptional({ example: 'Pick your favorite from these two products' })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 'Fashion' })
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
        type: [String],
        minItems: 2,
        maxItems: 2,
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
