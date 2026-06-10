import { IsUUID, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetPostByUserDto {
  @ApiProperty({ description: 'User ID (UUID)', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: "Filter by post type: 'normal' (exclude private), 'private', or 'private_circle' (private posts visible only to private circle). Default: normal", required: false, enum: ['normal', 'private', 'private_circle'], default: 'normal' })
  @IsOptional()
  @IsIn(['normal', 'private', 'private_circle'])
  type?: 'normal' | 'private' | 'private_circle' = 'normal';

  @ApiProperty({ description: 'Page (1-based)', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page (max 50)', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
} 