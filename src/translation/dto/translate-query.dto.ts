import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TranslateQueryDto {
  @ApiPropertyOptional({
    description: 'Target language code (e.g. pt, es, it, fr, en). Defaults to pt.',
    example: 'pt',
    default: 'pt',
  })
  @IsOptional()
  @IsString()
  lang?: string;
}
