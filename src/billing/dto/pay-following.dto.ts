import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class PayFollowingDto {
  @ApiProperty({
    description: 'Payment amount in USD',
    example: 10.0,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'User ID of the content creator who receives the payment (must have completed Stripe Connect onboarding)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  contentUserId: string;

  @ApiProperty({
    description: 'Whether to set up automatic monthly recurring auto-pay (defaults to true for Stripe subscriptions)',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAutoRenew?: boolean;
}
