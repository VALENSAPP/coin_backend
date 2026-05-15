import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class BuyFanSubscriptionDto {
  @ApiProperty({
    description: 'Amount to charge in cents (e.g., 1000 for $10.00)',
    example: 1000,
    type: Number
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'User ID of the creator being subscribed to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  buyUserId: string;

  @ApiProperty({
    description: 'User ID of the fan making the purchase',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  fanUserId?: string;
}
