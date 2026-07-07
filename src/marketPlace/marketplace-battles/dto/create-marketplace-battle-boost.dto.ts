import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

export class CreateMarketplaceBattleBoostDto {
    @ApiProperty({
        description: 'Marketplace battle boost package id',
        example: '11111111-1111-4111-8111-111111111111',
    })
    @IsUUID('4')
    packageId!: string;

    @ApiProperty({
        description: 'Whether to enable pin-on-top placement for this boost',
        example: true,
    })
    @IsBoolean()
    pinOnTop!: boolean;

    @ApiProperty({
        description: 'Whether to enable winner badge feature for this boost',
        example: false,
    })
    @IsBoolean()
    winnerBadge!: boolean;
}
