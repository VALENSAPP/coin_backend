import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class RecentActivitiesDto {
  @ApiPropertyOptional({
    description: 'Filter by activity type',
    enum: ['all', 'following', 'unfollowing', 'drops', 'flips'],
    example: 'all'
  })
  @IsOptional()
  @IsIn(['all', 'following', 'unfollowing', 'drops', 'flips', 'purchase', 'sell'])
  type?: 'all' | 'following' | 'unfollowing' | 'drops' | 'flips' | 'purchase' | 'sell';
}