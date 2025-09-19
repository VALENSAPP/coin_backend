import { IsNumber, IsOptional, IsString, IsUUID, Min, IsNotEmpty } from 'class-validator';
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
    description: 'Platform fee provided by frontend',
    example: 0.02,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  platformFee: number;

  @ApiProperty({
    description: 'Vendor fee provided by frontend',
    example: 0.05,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vendorFee: number;

  @ApiProperty({
    description: 'Amount after deducting fees provided by frontend',
    example: 9.93,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  restAmount: number;

  @ApiProperty({
    description: 'Tokens to be received provided by frontend',
    example: 993,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  tokensReceived: number;

  @ApiProperty({
    description: 'Token price at the time of purchase',
    example: 0.01,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  purchaseTokenPrice: number;

  @ApiProperty({
    description: 'Vendor user ID (whose tokens are being purchased). Optional - if not provided, platform tokens.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}

export class BuyTokenDto {
  @ApiProperty({
    description: 'User ID whose token is being purchased',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Amount of tokens to purchase (in USD)',
    example: 10.00,
    minimum: 0.01
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  userPaid: number;
}

export class GetTokenPriceDto {
  @ApiProperty({
    description: 'Token contract address to get price for',
    example: '0x1234567890123456789012345678901234567890'
  })
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;
}

export class SellTokenDto {
  @ApiProperty({
    description: 'Token contract address to sell',
    example: '0x1234567890123456789012345678901234567890'
  })
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @ApiProperty({
    description: 'Amount of tokens to sell (in wei, e.g., 100 tokens = 100000000000000000000)',
    example: '100000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  amountTokens: string;
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
    description: 'Token price at the time of purchase',
    example: 0.01
  })
  purchaseTokenPrice: number;

  @ApiProperty({
    description: 'Payment status',
    example: 'pending'
  })
  status: string;

  @ApiProperty({
    description: 'Stripe checkout session URL for payment',
    example: 'https://checkout.stripe.com/pay/cs_test_...'
  })
  sessionUrl?: string;
}