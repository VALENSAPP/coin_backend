import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListShopsQueryDto {
  @ApiPropertyOptional({
    description: 'Search by shop name, shop username, category, location, or owner username/display name',
    example: 'graziela',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: any }) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized.length ? normalized : undefined;
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by shop category',
    example: 'Fashion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: any }) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized.length ? normalized : undefined;
  })
  shopCategory?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
