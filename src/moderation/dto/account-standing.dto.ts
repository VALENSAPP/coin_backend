import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountStandingResponseDto {
  @ApiProperty({ example: 'usr_123' })
  userId!: string;

  @ApiProperty({
    enum: ['GOOD', 'WARNING', 'RESTRICTED', 'SUSPENDED', 'BANNED'],
    example: 'GOOD',
  })
  standing!: string;

  @ApiProperty({ example: 0 })
  warningCount!: number;

  @ApiProperty({ example: 0 })
  strikeCount!: number;

  @ApiPropertyOptional({ example: null })
  standingUntil?: Date | null;

  @ApiPropertyOptional({ example: null })
  standingReason?: string | null;

  @ApiProperty({
    example: [],
    description: 'Active feature restrictions (e.g. POSTING, COMMENTS, BATTLES)',
  })
  activeRestrictions!: Array<{
    scope: string;
    reason: string;
    endsAt?: Date | null;
  }>;

  @ApiProperty({ example: [] })
  recentViolations!: any[];
}
