import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { POST_TYPES, PostType } from './post-types';

export class CreatePostDto {
  @ApiProperty({ description: 'Text content of the post', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : null)
  text?: string;

  @ApiProperty({ description: 'Caption for the post', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : null)
  caption?: string;

  @ApiProperty({ description: 'Hashtags for the post', required: false, isArray: true, type: String })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  })
  hashtag?: string[];

  @ApiProperty({ description: 'Location for the post', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : null)
  location?: string;

  @ApiProperty({ description: 'Music for the post', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : null)
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

  @ApiProperty({ description: 'Link for the post', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : null)
  link?: string;

  @ApiProperty({ description: 'Visibility setting for the post', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : null)
  visibleTo?: string;

  @ApiProperty({ description: 'Tagged people user IDs', required: false, isArray: true, type: String })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  })
  taggedPeople?: string[];

  @ApiProperty({ description: 'Array of image/video files', required: false, type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    return [value];
  })
  images?: any[];

  @ApiProperty({ description: 'Type of post', required: false, enum: POST_TYPES })
  @IsOptional()
  @IsString()
  type?: PostType;

  @ApiProperty({ description: 'Raise amount for crowdfunding posts', required: false })
  @IsOptional()
  @Transform(({ value }: { value: any }) => value ? parseFloat(value) : null)
  raiseAmount?: number;

  @ApiProperty({ description: 'Start time for crowdfunding posts', required: false })
  @IsOptional()
  @Transform(({ value }: { value: any }) => value ? new Date(value) : null)
  start_time?: Date;

  @ApiProperty({ description: 'End time for crowdfunding posts', required: false })
  @IsOptional()
  @Transform(({ value }: { value: any }) => value ? new Date(value) : null)
  end_time?: Date;
}
