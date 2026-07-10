import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ReactMarketplaceBattleCommentDto {
    @ApiProperty({
        description: 'Reaction type for marketplace battle comment',
        enum: ['LIKE', 'DISLIKE', 'NONE'],
        example: 'LIKE',
    })
    @IsString()
    @IsNotEmpty()
    @IsIn(['LIKE', 'DISLIKE', 'NONE'])
    reaction: 'LIKE' | 'DISLIKE' | 'NONE';
}
