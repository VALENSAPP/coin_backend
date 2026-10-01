import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TranslateTextDto {
  @ApiProperty({
    description: 'The text, caption, or bio to translate',
    example: 'Living my best life in New York! 🗽 #vibes',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;

  @ApiPropertyOptional({
    description: 'Target language ISO code (e.g., pt, en, es, it, fr, de, ja)',
    example: 'pt',
    default: 'pt',
  })
  @IsOptional()
  @IsString()
  targetLang?: string;

  @ApiPropertyOptional({
    description: 'Source language ISO code if known (defaults to auto-detection)',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  sourceLang?: string;
}

export class TranslateBatchDto {
  @ApiProperty({
    description: 'Array of texts to translate',
    example: ['Hello world!', 'How are you?'],
  })
  @IsNotEmpty()
  texts: string[];

  @ApiPropertyOptional({
    description: 'Target language ISO code (e.g., pt, en, es, it, fr)',
    example: 'pt',
    default: 'pt',
  })
  @IsOptional()
  @IsString()
  targetLang?: string;

  @ApiPropertyOptional({
    description: 'Source language ISO code',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  sourceLang?: string;
}
