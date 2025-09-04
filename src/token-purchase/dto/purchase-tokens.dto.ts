import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseTokensDto {
  @ApiProperty({
    description: 'Amount in USD to spend on tokens',
    example: 10.00,
    minimum: 0.01
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Vendor user ID (whose tokens are being purchased). Optional - if not provided, platform tokens.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}

export class TokenPurchaseResponseDto {
  @ApiProperty({
    description: 'Purchase ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Original payment amount',
    example: 10.00
  })
  amount: number;

  @ApiProperty({
    description: 'Platform fee (0.2%)',
    example: 0.02
  })
  platformFee: number;

  @ApiProperty({
    description: 'Vendor fee (0.5%)',
    example: 0.05
  })
  vendorFee: number;

  @ApiProperty({
    description: 'Amount after fees',
    example: 9.33
  })
  restAmount: number;

  @ApiProperty({
    description: 'Tokens to be received (restAmount * 100)',
    example: 933
  })
  tokensReceived: number;

  @ApiProperty({
    description: 'Payment status',
    example: 'pending'
  })
  status: string;

  @ApiProperty({
    description: 'Stripe payment intent ID',
    example: 'pi_1234567890'
  })
  stripePaymentIntentId: string;
}