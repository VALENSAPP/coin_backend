import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateCrossShopChallengeDto {
    @ApiProperty({ description: 'Opponent shop/closet id to challenge' })
    @IsUUID('4')
    opponentClosetId!: string;

    @ApiProperty({ description: 'Your closet item id (challenger product)' })
    @IsUUID('4')
    myProductId!: string;

    @ApiProperty({ description: 'Opponent closet item id' })
    @IsUUID('4')
    opponentProductId!: string;

    @ApiProperty({ example: 'Which bag is hotter this season?' })
    @IsString()
    @Transform(({ value }: { value: any }) => String(value ?? '').trim())
    @MaxLength(500)
    question!: string;

    @ApiPropertyOptional({
        description: 'Platform points stake locked from challenger until accept/complete/cancel',
        example: 50,
        default: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    stake?: number;

    @ApiPropertyOptional({ example: 'Summer Shop Battle' })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined) return undefined;
        const normalized = String(value).trim();
        return normalized.length ? normalized : undefined;
    })
    @MaxLength(150)
    title?: string;

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
        default: false,
        description: 'If true, battle can be shared to feed after accept.',
    })
    @IsOptional()
    @IsBoolean()
    shareToFeed?: boolean;

    @ApiPropertyOptional({
        description: 'Battle start time. Applied when opponent accepts. Defaults to accept time.',
        example: '2026-07-24T10:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    startAt?: string;

    @ApiProperty({
        description: 'Battle end time. Applied when opponent accepts.',
        example: '2026-07-25T10:00:00.000Z',
    })
    @IsDateString()
    endAt!: string;

    @ApiPropertyOptional({
        description: 'Hours until invite expires (default 48).',
        example: 48,
        default: 48,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    inviteExpiresInHours?: number;
}
