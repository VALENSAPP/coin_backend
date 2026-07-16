import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMarketplacePaymentDto {
    @ApiProperty({
        description: 'Selected cart id (single seller/closet cart)',
        example: '6b8ea9f4-9285-4a31-9b16-db8cf4896d11',
    })
    @IsString()
    @IsNotEmpty()
    cartId: string;

    @ApiPropertyOptional({
        description: 'Selected shipping address id',
        example: 'a1d1132d-7e69-4c71-9ff1-f2ab79d9b9f5',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    addressId?: string;

    @ApiProperty({
        description: 'ISO currency code',
        example: 'usd',
        required: false,
    })
    @IsString()
    @IsOptional()
    currency?: string;
}
