import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SendPlatformPointsDto {
  @ApiPropertyOptional({
    description: 'User ID of the recipient. Either recipientId or recipientUserName must be provided.',
    example: 'd8c2d829-57e0-47bf-a1f9-e332dc33ee9c',
  })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Username of the recipient (without @ symbol).',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  recipientUserName?: string;

  @ApiProperty({
    description: 'Amount of platform points to send (must be at least 1).',
    example: 100,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional note / message accompanying the point transfer (max 255 chars).',
    example: 'Thanks for the great content!',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export enum PointTransferFilterType {
  ALL = 'ALL',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
}

export class GetPointTransfersDto {
  @ApiPropertyOptional({
    enum: PointTransferFilterType,
    default: PointTransferFilterType.ALL,
    description: 'Filter transfers by direction (ALL, SENT, RECEIVED)',
  })
  @IsOptional()
  @IsEnum(PointTransferFilterType)
  type?: PointTransferFilterType = PointTransferFilterType.ALL;

  @ApiPropertyOptional({
    description: 'Page number for pagination (starts at 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page (max 100)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
