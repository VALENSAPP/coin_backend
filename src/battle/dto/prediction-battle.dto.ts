import { IsEnum, IsOptional, IsString, Min, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PredictionCategory, PredictionProvider } from '@prisma/client';

export class PredictionQuestionsQueryDto {
  @ApiProperty({ enum: PredictionCategory })
  @IsEnum(PredictionCategory)
  category!: PredictionCategory;

  @ApiPropertyOptional({ enum: PredictionProvider, default: PredictionProvider.POLYMARKET })
  @IsOptional()
  @IsEnum(PredictionProvider)
  provider?: PredictionProvider;
}

export class CreatePredictionBattleDto {
  @ApiProperty({ enum: PredictionCategory })
  @IsEnum(PredictionCategory)
  category!: PredictionCategory;

  @ApiPropertyOptional({ enum: PredictionProvider, default: PredictionProvider.POLYMARKET })
  @IsOptional()
  @IsEnum(PredictionProvider)
  provider?: PredictionProvider;

  @ApiProperty()
  @IsString()
  externalMarketId!: string;

  @ApiProperty()
  @IsString()
  selectedSide!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stake?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
