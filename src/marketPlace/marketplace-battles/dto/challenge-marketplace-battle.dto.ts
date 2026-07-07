import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChallengeMarketplaceBattleDto {
    @ApiProperty({
        description: 'Challenger product id from seller closet',
        example: '11111111-1111-4111-8111-111111111111',
    })
    @IsUUID('4')
    challengerProductId!: string;

    @ApiPropertyOptional({
        example: 'Can the Champion Win Again?',
        maxLength: 150,
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) =>
        value === undefined || value === null ? undefined : String(value).trim(),
    )
    @IsNotEmpty()
    @MaxLength(150)
    title?: string;

    @ApiPropertyOptional({
        example: 'The previous winner faces another product',
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
}
