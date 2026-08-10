import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class RecentActivitiesDto {
  @ApiPropertyOptional({
    description: 'Filter by activity type',
    enum: ['purchase', 'sell', 'following'],
    example: 'purchase'
  })
  @IsOptional()
  @IsIn(['purchase', 'sell', 'following'])
  type?: 'purchase' | 'sell' | 'following';
}