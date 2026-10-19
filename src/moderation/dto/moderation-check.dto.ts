import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ModerationCheckDto {
  @ApiProperty({ example: 'usr_123', description: 'User submitting content' })
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ example: 'cmt_987', description: 'Stable unique ID of the content' })
  @IsString()
  @IsNotEmpty()
  content_id!: string;

  @ApiProperty({
    example: 'comment',
    description: 'Type of content (post, comment, battle, battle_comment, product, ebook, dm, user)',
  })
  @IsString()
  @IsNotEmpty()
  content_type!: string;

  @ApiProperty({
    example: 'battle',
    description: 'Feature where content originates (battle, post, marketplace, dm, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  feature!: string;

  @ApiProperty({ example: 'user submitted content', description: 'Text content to evaluate' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({
    type: [String],
    example: [],
    description: 'Array of media reference URLs or identifiers',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_refs?: string[];

  @ApiPropertyOptional({ example: 'en', description: 'Language code (e.g. en, pt)' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'cmt_654',
    description: 'Parent content ID if this is a reply or reaction',
  })
  @IsOptional()
  @IsString()
  reply_to_content_id?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['battle_222'],
    description: 'Context IDs (e.g. battleId, circleId, postId)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  context_ids?: string[];
}
