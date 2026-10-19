import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ReportReasonDtoEnum {
  HATE_DISCRIMINATION = 'HATE_DISCRIMINATION',
  HARASSMENT = 'HARASSMENT',
  THREATS_VIOLENCE = 'THREATS_VIOLENCE',
  SEXUAL_EXPLOITATION = 'SEXUAL_EXPLOITATION',
  CHILD_SAFETY = 'CHILD_SAFETY',
  SCAM_FRAUD = 'SCAM_FRAUD',
  IMPERSONATION = 'IMPERSONATION',
  PRIVACY = 'PRIVACY',
  SPAM_MANIPULATION = 'SPAM_MANIPULATION',
  ILLEGAL_ACTIVITY = 'ILLEGAL_ACTIVITY',
  OTHER = 'OTHER',
}

export enum ReportStatusDtoEnum {
  RECEIVED = 'RECEIVED',
  TRIAGED = 'TRIAGED',
  IN_REVIEW = 'IN_REVIEW',
  ACTIONED = 'ACTIONED',
  NO_VIOLATION = 'NO_VIOLATION',
  APPEALED = 'APPEALED',
  CLOSED = 'CLOSED',
}

export class CreateUniversalReportDto {
  @ApiProperty({ example: 'cmt_987', description: 'ID of the content or user being reported' })
  @IsString()
  @IsNotEmpty()
  content_id!: string;

  @ApiProperty({
    example: 'comment',
    description: 'Type of content (post, comment, battle, battle_comment, product, ebook, dm, user)',
  })
  @IsString()
  @IsNotEmpty()
  content_type!: string;

  @ApiProperty({ example: 'battle', description: 'Feature where content was found' })
  @IsString()
  @IsNotEmpty()
  feature!: string;

  @ApiPropertyOptional({ example: 'usr_456', description: 'User ID of the author/offender if known' })
  @IsOptional()
  @IsString()
  reported_user_id?: string;

  @ApiProperty({
    enum: ReportReasonDtoEnum,
    example: ReportReasonDtoEnum.HARASSMENT,
    description: 'Standardized reason for reporting',
  })
  @IsEnum(ReportReasonDtoEnum)
  @IsNotEmpty()
  reason_code!: ReportReasonDtoEnum;

  @ApiPropertyOptional({ example: 'Offensive language targeted at a participant', description: 'Additional context' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetReportsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by report status', enum: ReportStatusDtoEnum })
  @IsOptional()
  @IsEnum(ReportStatusDtoEnum)
  status?: ReportStatusDtoEnum;

  @ApiPropertyOptional({ description: 'Filter by priority (LOW, NORMAL, HIGH, CRITICAL)' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter by feature (post, battle, marketplace, dm)' })
  @IsOptional()
  @IsString()
  feature?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;
}
