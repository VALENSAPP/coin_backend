import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendClosetChatMessageDto {
    @ApiProperty({ example: 'Hi, when can you ship this order?' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    message!: string;
}
