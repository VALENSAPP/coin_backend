import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
    @ApiProperty({
        description: 'Marketplace order identifier',
        example: 'ORDER-10001',
    })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({
        description: 'Marketplace product owner user id (must have Stripe Connect onboarding complete)',
        example: '0f2e4a11-4efc-44ae-bf2e-4446d138ece2',
    })
    @IsString()
    @IsNotEmpty()
    productOwnerId: string;

    @ApiProperty({
        description: 'Total amount in major units (e.g. USD)',
        example: 49.99,
        minimum: 0.5,
    })
    @IsNumber()
    @Min(0.5)
    amount: number;

    @ApiProperty({
        description: 'ISO currency code',
        example: 'USD',
    })
    @IsString()
    @IsNotEmpty()
    currency: string;
}
