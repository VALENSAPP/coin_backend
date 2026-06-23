import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class SendTipDto {
    @ApiProperty({
        description: 'Tip amount in USD',
        example: 5.0,
        minimum: 0.01,
    })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({
        description: 'User ID of the receiver who gets 100% of the tip',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsUUID()
    receiverUserId: string;
}
