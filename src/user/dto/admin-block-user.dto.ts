import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AdminBlockUserDto {
  @ApiProperty({
    description: 'User ID to block',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'Invalid User ID format (UUID required)' })
  userId: string;

  @ApiPropertyOptional({
    description: 'Reason for blocking the user',
    example: 'Violation of platform terms of service',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminUnblockUserDto {
  @ApiProperty({
    description: 'User ID to unblock',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'Invalid User ID format (UUID required)' })
  userId: string;
}

export class GetBlockedUsersAdminDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search filter by email, userName, displayName, or phoneNumber',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
