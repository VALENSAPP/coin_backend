import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ModerationContentTypeEnum {
  POST = 'POST',
  COMMENT = 'COMMENT',
  PRODUCT = 'PRODUCT',
  EBOOK = 'EBOOK',
  ALL = 'ALL',
}

export class GetModerationQueueDto {
  @ApiPropertyOptional({ enum: ModerationContentTypeEnum, default: ModerationContentTypeEnum.ALL })
  @IsOptional()
  @IsEnum(ModerationContentTypeEnum)
  type?: ModerationContentTypeEnum = ModerationContentTypeEnum.ALL;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ApproveContentDto {
  @ApiProperty({ enum: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'] })
  @IsNotEmpty()
  @IsEnum(['POST', 'COMMENT', 'PRODUCT', 'EBOOK'])
  contentType: 'POST' | 'COMMENT' | 'PRODUCT' | 'EBOOK';

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectContentDto {
  @ApiProperty({ enum: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'] })
  @IsNotEmpty()
  @IsEnum(['POST', 'COMMENT', 'PRODUCT', 'EBOOK'])
  contentType: 'POST' | 'COMMENT' | 'PRODUCT' | 'EBOOK';

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contentId: string;

  @ApiProperty({ description: 'Rejection reason shown to the user' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
