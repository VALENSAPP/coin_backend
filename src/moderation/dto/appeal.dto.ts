import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAppealDto {
  @ApiProperty({
    example: 'This was a friendly joke between friends and not intended as harassment.',
    description: 'User-provided explanation for why the decision or restriction should be overturned',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Please provide a short explanation (at least 10 characters).' })
  @MaxLength(1000, { message: 'Explanation cannot exceed 1000 characters.' })
  reason!: string;
}
