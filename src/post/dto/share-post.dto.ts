import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class SharePostDto {
  @ApiProperty({ description: 'ID of the media to share (post, reel, story)' })
  @IsString()
  mediaId: string;

  @ApiProperty({ description: 'Type of the media (POST, STORY, REEL)' })
  @IsString()
  mediaType: string;

  @ApiProperty({ description: 'Type of the conversation (MEDIA, CHAT)' })
  @IsString()
  conversationType: string;

  @ApiProperty({ description: 'ID of the user who is sharing the media' })
  @IsString()
  sharedUserId: string;

  @ApiProperty({ description: 'IDs of users to whom the media is being shared', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  receiverUserId: string[];
}

export class DeleteSharedPostDto {
  @ApiProperty({ type: [String], description: 'Array of shared post IDs to delete' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  shareIds: string[];
}
