import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PostLikeByUserDto {
  @ApiProperty({
    description: 'Post ID to like',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  postId: string;
}

export class PostLikeListDto {
  @ApiProperty({
    description: 'Post ID to get likes for',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  postId: string;
} 