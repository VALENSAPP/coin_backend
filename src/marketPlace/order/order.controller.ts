import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BuyerOrderListQueryDto } from './dto/buyer-order-list-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ReportOrderProblemDto } from './dto/report-order-problem.dto';
import { OrderService } from './order.service';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get buyer order history with optional status / cancellation filtering' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by OrderStatus (e.g. CANCELLED, PENDING, PROCESSING, SHIPPED, DELIVERED)' })
    @ApiQuery({ name: 'cancellationStatus', required: false, description: 'Filter by CancellationStatus (e.g. REQUESTED, APPROVED, DECLINED)' })
    async getMyOrders(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: BuyerOrderListQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.orderService.getBuyerOrders(userId, query);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Order id' })
    @ApiOperation({ summary: 'Get order details by id for buyer' })
    async getOrderById(@Req() req: Request, @Param('id') id: string) {
        const userId = (req.user as any)?.userId;
        return this.orderService.getBuyerOrderDetails(userId, id);
    }

    @Patch(':id/cancel')
    @Post(':id/cancel-request')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Order id' })
    @ApiOperation({ summary: 'Request order cancellation & refund (buyer side; notifies seller)' })
    async cancelOrder(
        @Req() req: Request,
        @Param('id') id: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CancelOrderDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.orderService.cancelOrder(userId, id, dto.reason);
    }

    @Post(':id/confirm-received')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Order id' })
    @ApiOperation({ summary: 'Buyer confirms delivery receipt and releases seller payout immediately' })
    async confirmReceived(@Req() req: Request, @Param('id') id: string) {
        const userId = (req.user as any)?.userId;
        return this.orderService.confirmOrderReceived(userId, id);
    }

    @Post(':id/report-problem')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'Order id' })
    @ApiOperation({ summary: 'Buyer reports a delivery problem and freezes seller payout' })
    async reportProblem(
        @Req() req: Request,
        @Param('id') id: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ReportOrderProblemDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.orderService.reportOrderProblem(userId, id, dto.reason);
    }
}
