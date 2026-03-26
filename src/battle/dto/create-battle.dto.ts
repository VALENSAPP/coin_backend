import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BattleFormat {
  POLL = 'POLL',
  HEAD_TO_HEAD = 'HEAD_TO_HEAD',
}

export class CreateBattleDto {
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
}
