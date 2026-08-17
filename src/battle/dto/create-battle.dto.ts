import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BattleType, PredictionCategory, PredictionProvider } from '@prisma/client';

export enum BattleFormat {
  POLL = 'POLL',
  HEAD_TO_HEAD = 'HEAD_TO_HEAD',
}

export class CreateBattleDto {
  @ApiPropertyOptional({ enum: BattleType, default: BattleType.NORMAL })
  @IsOptional()
  @IsEnum(BattleType)
  battleType?: BattleType;

  @ApiProperty({ enum: BattleFormat })
  @IsEnum(BattleFormat)
  format!: BattleFormat;

  @ApiProperty()
  @IsString()
  question!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Existing option image URLs, aligned with options by index' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionImages?: string[];

  @ApiPropertyOptional({ type: [Number], description: 'Indexes for uploaded optionImages files, aligned with file order' })
  @IsOptional()
  @IsArray()
  optionImageIndexes?: number[];

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stake?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invitedUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionMethod?: string;

  @ApiPropertyOptional({ enum: PredictionCategory, description: 'Required when battleType is PREDICTION' })
  @IsOptional()
  @IsEnum(PredictionCategory)
  predictionCategory?: PredictionCategory;

  @ApiPropertyOptional({ enum: PredictionProvider, default: PredictionProvider.POLYMARKET })
  @IsOptional()
  @IsEnum(PredictionProvider)
  predictionProvider?: PredictionProvider;

  @ApiPropertyOptional({ description: 'Third-party market/question id from prediction/questions API' })
  @IsOptional()
  @IsString()
  externalMarketId?: string;

  @ApiPropertyOptional({ description: 'Third-party event id from prediction/questions API' })
  @IsOptional()
  @IsString()
  externalEventId?: string;

}
