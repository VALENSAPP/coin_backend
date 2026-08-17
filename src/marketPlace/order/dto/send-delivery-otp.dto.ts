import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SendDeliveryOtpDto {
    @ApiPropertyOptional({
        description: 'OTP validity in minutes (default 10, min 1, max 30)',
        example: 10,
        minimum: 1,
        maximum: 30,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    expiresInMinutes?: number;
}
