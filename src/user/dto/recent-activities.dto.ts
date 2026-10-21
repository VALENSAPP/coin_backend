import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsString } from 'class-validator';

export class RecentActivitiesDto {
  @ApiPropertyOptional({
    description: 'Filter by activity type',
    enum: ['all', 'following', 'unfollowing', 'drops', 'flips', 'posts'],
    example: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'following', 'unfollowing', 'drops', 'flips', 'posts', 'purchase', 'sell'])
  type?: 'all' | 'following' | 'unfollowing' | 'drops' | 'flips' | 'posts' | 'purchase' | 'sell';

  @ApiPropertyOptional({
    description: 'Override preferred language',
    enum: ['en', 'pt', 'it', 'es', 'fr', 'hi'],
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({
    description: 'Device ID for device-level language preference',
    example: 'device-uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}