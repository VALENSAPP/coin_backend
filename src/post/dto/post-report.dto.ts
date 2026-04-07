import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PostReportDto {
  @ApiProperty({ description: 'Post ID to report' })
  @IsString()
  postId!: string;

  @ApiProperty({ description: 'Reason for reporting', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
