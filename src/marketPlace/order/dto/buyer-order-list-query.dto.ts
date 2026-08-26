import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationStatus, OrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class BuyerOrderListQueryDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Filter by order status (e.g. CANCELLED, PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED)',
        enum: OrderStatus,
        example: OrderStatus.CANCELLED,
    })
    @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiPropertyOptional({
        description: 'Filter by cancellation request status (NONE, REQUESTED, APPROVED, DECLINED)',
        enum: CancellationStatus,
        example: CancellationStatus.REQUESTED,
    })
    @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
    @IsEnum(CancellationStatus)
    @IsOptional()
    cancellationStatus?: CancellationStatus;
}
