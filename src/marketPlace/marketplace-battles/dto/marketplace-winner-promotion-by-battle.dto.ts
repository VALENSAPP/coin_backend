import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarketplaceWinnerPromotionByBattleDto {
    @ApiProperty({
        description: 'Marketplace battle id',
        format: 'uuid',
    })
    @IsUUID('4')
    battleId!: string;
}
