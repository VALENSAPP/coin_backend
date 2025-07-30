import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPostByIdDto {
  @ApiProperty({ description: 'Post ID (UUID)', required: true })
  @IsUUID()
  postId: string;
} 