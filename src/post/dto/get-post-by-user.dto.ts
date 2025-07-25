import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPostByUserDto {
  @ApiProperty({ description: 'User ID (UUID)', required: true })
  @IsUUID()
  userId: string;
} 