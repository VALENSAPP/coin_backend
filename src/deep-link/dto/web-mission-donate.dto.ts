import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class WebMissionDonateDto {
  @ApiProperty({
    description: 'Donation amount in USD',
    example: 10,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional note for the donation',
    example: 'Happy to support this mission!',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
