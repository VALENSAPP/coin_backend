import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PublishMarketplaceBattleDto {
    @ApiPropertyOptional({
        description: 'Battle start time in ISO 8601 format. If omitted, publish immediately.',
        example: '2026-07-10T10:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    startAt?: string;

    @ApiProperty({
        description: 'Battle end time in ISO 8601 format.',
        example: '2026-07-11T10:00:00.000Z',
    })
    @IsDateString()
    endAt!: string;
}
