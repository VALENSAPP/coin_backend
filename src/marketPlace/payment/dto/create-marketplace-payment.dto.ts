import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMarketplacePaymentDto {
    @ApiProperty({
        description: 'Selected shipping address id',
        example: 'a1d1132d-7e69-4c71-9ff1-f2ab79d9b9f5',
    })
    @IsString()
    @IsNotEmpty()
    addressId: string;

    @ApiProperty({
        description: 'ISO currency code',
        example: 'usd',
        required: false,
    })
    @IsString()
    @IsOptional()
    currency?: string;
}
