import { IsOptional, IsString, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditPostDto {
  @ApiProperty({ description: 'Text content of the post', required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ description: 'Caption for the post', required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ description: 'Hashtags for the post', required: false, isArray: true, type: String })
  @IsOptional()
  @IsArray()
  hashtag?: string[];

  @ApiProperty({ description: 'Location for the post', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Music for the post', required: false })
  @IsOptional()
  @IsString()
  music?: string;

  @ApiProperty({ description: 'Tagged people user IDs', required: false, isArray: true, type: String })
  @IsOptional()
  @IsArray()
  taggedPeople?: string[];

  @ApiProperty({ description: 'Array of image files', required: false, type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  images?: any[];
} 