import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class VoteMarketplaceBattleDto {
    @ApiProperty({
        description: 'Participant id to vote for',
        example: '11111111-1111-4111-8111-111111111111',
    })
    @IsUUID('4')
    participantId!: string;
}
