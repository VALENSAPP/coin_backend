import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BattleInviteDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  invitedUserId!: string;
}

export class BattleResponseDto {
  @ApiProperty()
  @IsString()
  battleId!: string;
}

export class BattleJoinDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  side?: string;
}

export class BattlePredictionDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  side!: string;

  @ApiProperty()
  @IsString()
  justification!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceUrl?: string;
}

export class BattleCommentDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  comment!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class BattleCommentLikeDto {
  @ApiProperty()
  @IsString()
  commentId!: string;
}

export class BattleVoteDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  side!: string;
}

export class BattleCloseDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctSide?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  winningSide?: string;
}

export class BattleRebuildStatsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}
