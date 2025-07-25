import { IsOptional, IsString, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'Text content of the post', required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ description: 'Array of image files', required: false, type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  images?: any[];
} 