import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class HideChatDto {
  @ApiProperty({ description: 'ID of the chat to hide' })
  @IsString()
  @IsNotEmpty()
  chatId: string;
}