import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Transform, Type as TransformType } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { POST_TYPES, PostType } from './post-types';

const POST_FORMATS = ['image', 'video', 'reel', 'ebook'] as const;
type PostFormat = (typeof POST_FORMATS)[number];

export class VideoTextItemDto {
  @ApiProperty({ description: 'Text to draw on the video' })
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: any }) => (typeof value === 'string' ? value.trim() : value))
  text!: string;

  @ApiProperty({ description: 'Horizontal position in percentage (0 to 1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  xPercent!: number;

  @ApiProperty({ description: 'Vertical position in percentage (0 to 1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  yPercent!: number;

  @ApiProperty({ description: 'Font size in pixels', minimum: 8, maximum: 200 })
  @IsInt()
  @Min(8)
  @Max(200)
  fontSize!: number;

  @ApiProperty({ description: 'Text color, e.g. white, yellow, #FFFFFF' })
  @IsString()
  @MaxLength(40)
  color!: string;
}

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

  @ApiProperty({ description: 'Format of the post', required: false, default: 'image', enum: POST_FORMATS })
  @IsOptional()
  @IsString()
  @IsIn(POST_FORMATS)
  @Transform(({ value }: { value: any }) => value && value.trim() !== '' ? value : 'image')
  format?: PostFormat;

  @ApiProperty({
    description: 'Whether ebook can be downloaded',
    required: false,
    default: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: any }) => {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return Boolean(value);
  })
  allowDownload?: boolean;

  @ApiProperty({
    description: 'Table of contents entries for ebook posts',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: any }) => {
    if (value === '' || value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      return [value.trim()].filter(Boolean);
    }
    return [];
  })
  tableContents?: string[];

  @ApiProperty({
    description: 'Ebook PDF URL after upload',
    required: false,
  })
  @IsOptional()
  @IsString()
  ebookpdf?: string;

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

  @ApiProperty({
    description: 'Mark post as trust post',
    required: false,
    default: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: any }) => {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return Boolean(value);
  })
  isTrustPost?: boolean;

  @ApiProperty({
    description: 'Enable FFmpeg video text overlay processing for any post that includes video files',
    required: false,
    default: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: any }) => {
    if (Array.isArray(value)) return true;
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return Boolean(value);
  })
  videoText?: boolean = false;

  @ApiProperty({
    description: 'Text overlays for video rendering. Supports JSON string or array.',
    required: false,
    type: [VideoTextItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @TransformType(() => VideoTextItemDto)
  @Transform(({ value, obj }: { value: any; obj: any }) => {
    const source =
      value ??
      obj?.videoTextItems ??
      obj?.videoTextArray ??
      (Array.isArray(obj?.videoText) ? obj.videoText : undefined);

    if (source === null || source === undefined || source === '') return [];
    if (Array.isArray(source)) return source;

    if (typeof source === 'object') {
      return [source];
    }

    if (typeof source === 'string') {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
        return [];
      } catch {
        return [];
      }
    }

    return [];
  })
  videoTextItems?: VideoTextItemDto[];
}
