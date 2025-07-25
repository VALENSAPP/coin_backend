import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeletePostDto {
  @ApiProperty({ description: 'Post ID (UUID)', required: true })
  @IsUUID()
  postId: string;

  @ApiProperty({ description: 'User ID (UUID)', required: true })
  @IsUUID()
  userId: string;
} 