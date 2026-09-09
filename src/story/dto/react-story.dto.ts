import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReactStoryDto {
  @ApiProperty({ description: 'ID of the story / drop to react to', required: true })
  @IsNotEmpty()
  @IsString()
  storyId: string;

  @ApiProperty({ description: 'Emoji reaction or message reply (e.g. ❤️, 🔥, 😂)', required: true })
  @IsNotEmpty()
  @IsString()
  reaction: string;

  @ApiProperty({ description: 'Optional highlight ID if reacted from a highlight context', required: false })
  @IsOptional()
  @IsString()
  highlightId?: string;
}
