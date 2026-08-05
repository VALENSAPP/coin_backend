import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePostMessageDto {
  @ApiPropertyOptional({ description: 'User ID. Defaults to the authenticated user when omitted.' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Message shown for photo posts' })
  @IsOptional()
  @IsString()
  messageForPhotos?: string;

  @ApiPropertyOptional({ description: 'Message shown for video posts' })
  @IsOptional()
  @IsString()
  messageForVideos?: string;

  @ApiPropertyOptional({ description: 'Message shown for ebook posts' })
  @IsOptional()
  @IsString()
  messageForEbooks?: string;
}
