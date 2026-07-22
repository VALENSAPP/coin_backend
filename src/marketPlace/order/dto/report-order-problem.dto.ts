import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportOrderProblemDto {
    @ApiPropertyOptional({
        description: 'Optional description of the delivery problem',
        example: 'Package was marked delivered but I did not receive it',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
