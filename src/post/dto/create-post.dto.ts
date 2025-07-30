import { IsOptional, IsString, IsArray, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsArray()
  @Transform(({ value }: { value: any }) => Array.isArray(value) && value.length > 0 ? value : [])
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

  @ApiProperty({ description: 'Tagged people user IDs', required: false, isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: any }) => Array.isArray(value) && value.length > 0 ? value : [])
  taggedPeople?: string[];

  @ApiProperty({ description: 'Array of image files', required: false, type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    return [value];
  })
  images?: any[];
} 