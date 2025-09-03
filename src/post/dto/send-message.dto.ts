import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'ID of the user sending the message' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'ID of the user receiving the message' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  message: string;
}