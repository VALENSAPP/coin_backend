import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMarketplacePaymentDto {
    @ApiProperty({
        description: 'ISO currency code',
        example: 'usd',
        required: false,
    })
    @IsString()
    @IsOptional()
    currency?: string;
}
