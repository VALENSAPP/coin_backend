import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ChatStatusUpdateDto {
  @ApiProperty({ description: 'ID of the chat to update status for' })
  @IsString()
  @IsNotEmpty()
  chatId: string;
}