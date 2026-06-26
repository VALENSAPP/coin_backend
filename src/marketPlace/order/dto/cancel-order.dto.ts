import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
    @ApiPropertyOptional({
        description: 'Optional cancellation reason',
        example: 'Ordered by mistake',
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    reason?: string;
}
