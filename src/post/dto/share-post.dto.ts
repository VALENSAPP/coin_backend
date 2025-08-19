import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty  } from 'class-validator';

export class SharePostDto {
  @ApiProperty({ description: 'ID of the post to share' })
  @IsString()
  postId: string;

  @ApiProperty({ description: 'ID of the user who is sharing the post' })
  @IsString()
  sharedUserId: string;

  @ApiProperty({ description: 'ID of the user to whom the post is being shared' })
  @IsString()
  receiverUserId: string;
}

export class DeleteSharedPostDto {
  @ApiProperty({ type: [String], description: 'Array of shared post IDs to delete' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  shareIds: string[];
}