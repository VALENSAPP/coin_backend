import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateMarketplaceBattleBoostDto {
    @ApiProperty({
        description: 'Marketplace battle boost package id',
        example: '11111111-1111-4111-8111-111111111111',
    })
    @IsUUID('4')
    packageId!: string;
}
