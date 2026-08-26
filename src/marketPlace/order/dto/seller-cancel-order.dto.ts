import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SellerCancelOrderDto {
    @ApiProperty({
        description: 'Reason for cancellation by seller (e.g. Out of stock, Damaged item, Customer requested)',
        example: 'Out of stock',
    })
    @IsString()
    @MaxLength(300)
    reason!: string;

    @ApiPropertyOptional({
        description: 'Whether to restore product stock quantity back to inventory',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    restock?: boolean = true;
}
