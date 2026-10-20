import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ModerationContentTypeEnum {
  POST = 'POST',
  COMMENT = 'COMMENT',
  PRODUCT = 'PRODUCT',
  EBOOK = 'EBOOK',
  BATTLE = 'BATTLE',
  BATTLE_COMMENT = 'BATTLE_COMMENT',
  DM = 'DM',
  USER = 'USER',
  ALL = 'ALL',
}

export enum AdminQueueTypeEnum {
  ALL = 'ALL',
  AI_FLAGGED = 'AI_FLAGGED',
  REPORTS = 'REPORTS',
  CRITICAL = 'CRITICAL',
  APPEALS = 'APPEALS',
  SUSPENDED_USERS = 'SUSPENDED_USERS',
  BANNED_USERS = 'BANNED_USERS',
  MARKETPLACE = 'MARKETPLACE',
  CHILD_SAFETY = 'CHILD_SAFETY',
}

export enum AdminCaseActionEnum {
  NO_VIOLATION = 'NO_VIOLATION',
  REMOVE = 'REMOVE',
  WARNING = 'WARNING',
  STRIKE = 'STRIKE',
  FEATURE_RESTRICTION = 'FEATURE_RESTRICTION',
  SUSPENSION_24H = 'SUSPENSION_24H',
  SUSPENSION_7D = 'SUSPENSION_7D',
  SUSPENSION_30D = 'SUSPENSION_30D',
  PERMANENT_BAN = 'PERMANENT_BAN',
  ESCALATE = 'ESCALATE',
}

export enum AppealVerdictEnum {
  OVERTURN = 'OVERTURN',
  UPHOLD = 'UPHOLD',
}

export class GetModerationQueueDto {
  @ApiPropertyOptional({ enum: ModerationContentTypeEnum, default: ModerationContentTypeEnum.ALL })
  @IsOptional()
  @IsEnum(ModerationContentTypeEnum)
  type?: ModerationContentTypeEnum = ModerationContentTypeEnum.ALL;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class GetCasesQueryDto {
  @ApiPropertyOptional({ enum: AdminQueueTypeEnum, default: AdminQueueTypeEnum.ALL })
  @IsOptional()
  @IsEnum(AdminQueueTypeEnum)
  queue?: AdminQueueTypeEnum = AdminQueueTypeEnum.ALL;

  @ApiPropertyOptional({ description: 'Filter by feature (post, battle, marketplace, dm)' })
  @IsOptional()
  @IsString()
  feature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class ApplyCaseActionDto {
  @ApiProperty({ enum: AdminCaseActionEnum, example: AdminCaseActionEnum.WARNING })
  @IsEnum(AdminCaseActionEnum)
  @IsNotEmpty()
  action!: AdminCaseActionEnum;

  @ApiPropertyOptional({ example: 'Targeted hostility towards user' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'HARASSMENT_TARGETED_LOW' })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional({
    example: 'POSTING',
    description: 'Scope if action is FEATURE_RESTRICTION (POSTING, COMMENTS, BATTLES, DMS, ALL)',
  })
  @IsOptional()
  @IsString()
  restrictionScope?: string;
}

export class AppealVerdictDto {
  @ApiProperty({ enum: AppealVerdictEnum, example: AppealVerdictEnum.OVERTURN })
  @IsEnum(AppealVerdictEnum)
  @IsNotEmpty()
  verdict!: AppealVerdictEnum;

  @ApiPropertyOptional({ example: 'Reviewed context; post was a harmless quote.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveContentDto {
  @ApiProperty({ enum: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'] })
  @IsNotEmpty()
  @IsEnum(['POST', 'COMMENT', 'PRODUCT', 'EBOOK'])
  contentType!: 'POST' | 'COMMENT' | 'PRODUCT' | 'EBOOK';

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectContentDto {
  @ApiProperty({ enum: ['POST', 'COMMENT', 'PRODUCT', 'EBOOK'] })
  @IsNotEmpty()
  @IsEnum(['POST', 'COMMENT', 'PRODUCT', 'EBOOK'])
  contentType!: 'POST' | 'COMMENT' | 'PRODUCT' | 'EBOOK';

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contentId!: string;

  @ApiProperty({ description: 'Rejection reason shown to the user' })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}
