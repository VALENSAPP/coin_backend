import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommentOnPostDto {
  @ApiProperty({ example: 'post-uuid', description: 'ID of the post to comment on' })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({ example: 'Nice post!', description: 'Comment text' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class GetCommentListOnPostDto {
  @IsString()
  @IsNotEmpty()
  postId: string;
}

export class CommentDeleteDto {
  @IsString()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsNotEmpty()
  commentId: string;
}
