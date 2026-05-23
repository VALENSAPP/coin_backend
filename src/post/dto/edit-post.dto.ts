import { IsOptional, IsString, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { POST_TYPES, PostType } from './post-types';

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
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').filter(item => item.trim() !== '');
    return [value];
  })
  hashtag?: string[];

  @ApiProperty({ description: 'Location for the post', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Music for the post', required: false })
  @IsOptional()
  @IsString()
  music?: string;

  @ApiProperty({ description: 'YouTube Music metadata (JSON)', required: false, type: Object })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  youtubeMusicMeta?: any;

  @ApiProperty({ description: 'Tagged people user IDs', required: false, isArray: true, type: String })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').filter(item => item.trim() !== '');
    return [value];
  })
  taggedPeople?: string[];

  @ApiProperty({ description: 'Visibility setting for the post', required: false })
  @IsOptional()
  @IsString()
  visibleTo?: string;

  @ApiProperty({ description: 'Type of post', required: false, enum: POST_TYPES })
  @IsOptional()
  @IsString()
  type?: PostType;

  @ApiProperty({ description: 'Array of image files', required: false, type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    return [value];
  })
  images?: any[];
} 
