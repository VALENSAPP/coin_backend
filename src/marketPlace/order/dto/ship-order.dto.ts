import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ShipOrderDto {
    @ApiProperty({ description: 'Shipping carrier name', example: 'FedEx' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    carrier: string;

    @ApiProperty({ description: 'Tracking number provided by carrier', example: '771234567890' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    trackingNumber: string;
}
