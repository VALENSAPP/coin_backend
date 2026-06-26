import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SellerOrderListQueryDto } from './dto/seller-order-list-query.dto';
import { ShipOrderDto } from './dto/ship-order.dto';
import { SellerOrderService } from './seller-order.service';

@ApiTags('seller-orders')
@Controller('seller/orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SellerOrderController {
    constructor(private readonly sellerOrderService: SellerOrderService) { }

    @Get()
    @ApiOperation({ summary: 'Get orders for authenticated seller' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'status', required: false, example: 'PENDING' })
    async getSellerOrders(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: SellerOrderListQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.sellerOrderService.getSellerOrders(userId, query);
    }

    @Get(':orderId')
    @ApiOperation({ summary: 'Get complete order details for authenticated seller' })
    @ApiParam({ name: 'orderId', description: 'Order id' })
    async getSellerOrderDetails(@Req() req: Request, @Param('orderId') orderId: string) {
        const userId = (req.user as any)?.userId;
        return this.sellerOrderService.getSellerOrderDetails(userId, orderId);
    }

    @Patch(':orderId/processing')
    @ApiOperation({ summary: 'Mark order as processing (Pending -> Processing)' })
    @ApiParam({ name: 'orderId', description: 'Order id' })
    async markOrderProcessing(@Req() req: Request, @Param('orderId') orderId: string) {
        const userId = (req.user as any)?.userId;
        return this.sellerOrderService.markOrderProcessing(userId, orderId);
    }

    @Patch(':orderId/ship')
    @ApiOperation({ summary: 'Mark order as shipped (Processing -> Shipped)' })
    @ApiParam({ name: 'orderId', description: 'Order id' })
    async markOrderShipped(
        @Req() req: Request,
        @Param('orderId') orderId: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ShipOrderDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.sellerOrderService.markOrderShipped(userId, orderId, dto);
    }

    @Patch(':orderId/deliver')
    @ApiOperation({ summary: 'Mark order as delivered (Shipped -> Delivered)' })
    @ApiParam({ name: 'orderId', description: 'Order id' })
    async markOrderDelivered(@Req() req: Request, @Param('orderId') orderId: string) {
        const userId = (req.user as any)?.userId;
        return this.sellerOrderService.markOrderDelivered(userId, orderId);
    }
}
