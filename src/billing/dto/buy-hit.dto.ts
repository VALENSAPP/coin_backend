import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsUUID, Max, Min } from 'class-validator';

export class BuyHitDto {
  @ApiProperty({
    description: 'Amount to charge in cents (e.g., 1000 for $10.00)',
    example: 1000,
    type: 'number',
    format: 'float'
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Number of hits to purchase (maximum 5 hits)',
    example: 5,
    type: Number
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(5)
  hitCount: number;

  @ApiProperty({
    description: 'User ID making the purchase',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  userId: string;
}