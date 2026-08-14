import { Type as TransformType } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
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

export class BattleChallengerPositionDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty({ description: 'Creator selected side/position' })
  @IsString()
  side!: string;

  @ApiProperty({ description: 'Creator opening comment/argument' })
  @IsString()
  comment!: string;
}

export class BattleOpponentPositionDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty({ description: 'Invited user opening comment/argument. Side is assigned automatically from the remaining option.' })
  @IsString()
  comment!: string;
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

  @ApiPropertyOptional({ description: 'Required for normal poll battles; optional for provider-backed prediction battles' })
  @IsOptional()
  @IsString()
  justification?: string;

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

export class BattleCommentPinDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  commentId!: string;
}

export class BattleCommentUnpinDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  commentId!: string;
}

export class BattleCommentHighlightRangeDto {
  @ApiProperty({ description: 'Inclusive start index of highlighted text' })
  @IsInt()
  @Min(0)
  startIndex!: number;

  @ApiProperty({ description: 'Exclusive end index of highlighted text' })
  @IsInt()
  @Min(1)
  endIndex!: number;
}

export class BattleCommentHighlightDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiProperty()
  @IsString()
  commentId!: string;

  @ApiProperty({
    type: [BattleCommentHighlightRangeDto],
    description: 'Highlighted text ranges to store as JSON array',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @TransformType(() => BattleCommentHighlightRangeDto)
  highlights!: BattleCommentHighlightRangeDto[];
}

export class BattleCommentRemoveHighlightDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

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

  @ApiPropertyOptional({ description: 'Optional comment to post along with vote' })
  @IsOptional()
  @IsString()
  comment?: string;
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

export class BattleEditQuestionDto {
  @ApiProperty()
  @IsString()
  battleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional updated options/sides for the battle',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}
