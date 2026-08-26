import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveCancellationDto {
    @ApiPropertyOptional({
        description: 'Whether to restore product quantity back to inventory',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    restock?: boolean = true;
}

export class DeclineCancellationDto {
    @ApiProperty({
        description: 'Reason for declining the cancellation request',
        example: 'Item is already packed and scheduled for carrier pickup',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    declineReason!: string;
}
