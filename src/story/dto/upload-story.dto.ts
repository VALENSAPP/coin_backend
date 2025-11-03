import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadStoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  caption?: string;
}


