import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PinPostDto {
  @ApiProperty({ description: 'Post ID to pin', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  postId: string;
}

export class UnpinPostDto {
  @ApiProperty({ description: 'Post ID to unpin', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  postId: string;
}

