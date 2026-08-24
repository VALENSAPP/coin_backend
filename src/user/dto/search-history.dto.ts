import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AddSearchHistoryDto {
  @ApiPropertyOptional({ description: 'Search text keyword', example: 'alex' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Target user ID clicked/selected', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  searchedUserId?: string;
}

export class GetSearchHistoryDto {
  @ApiPropertyOptional({ description: 'Maximum number of history records to return (default: 20)', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
