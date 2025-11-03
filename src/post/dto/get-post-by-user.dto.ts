import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPostByUserDto {
  @ApiProperty({ description: 'User ID (UUID)', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;
} 