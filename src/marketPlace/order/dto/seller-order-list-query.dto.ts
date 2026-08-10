import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum SellerOrderShippingType {
    ALL = 'all',
    LOCAL_PICKUP = 'local-pickup',
    SHIP_TO_DELIVER = 'ship-to-deliver',
}

export class SellerOrderListQueryDto {
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
        description: 'Filter by order status',
        enum: OrderStatus,
        example: OrderStatus.PENDING,
    })
    @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiPropertyOptional({
        description: 'Filter by fulfillment type',
        enum: SellerOrderShippingType,
        default: SellerOrderShippingType.ALL,
        example: SellerOrderShippingType.ALL,
    })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsEnum(SellerOrderShippingType)
    @IsOptional()
    shippingType?: SellerOrderShippingType = SellerOrderShippingType.ALL;
}
