import { Controller, Get, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { DashboardItemsQueryDto } from './dto/dashboard-items-query.dto';
import { DashboardPaginationDto } from './dto/dashboard-pagination.dto';
import { MarketPlaceOverviewFilterDto, MarketPlaceOverviewRange } from './dto/marketplace-overview-filter.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('seller-dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get()
    @ApiOperation({ summary: 'Get seller dashboard overview' })
    async getOverview(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.dashboardService.getOverview(userId);
    }

    @Get('marketPlaceOverview')
    @ApiOperation({ summary: 'Get marketplace overview (views, likes, orders, cancelled orders, revenue) by range' })
    @ApiQuery({
        name: 'range',
        required: false,
        enum: MarketPlaceOverviewRange,
        description: 'weekly (last 7 days) or monthly (last 30 days)',
    })
    async getMarketPlaceOverview(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: MarketPlaceOverviewFilterDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.dashboardService.getMarketPlaceOverview(userId, query);
    }

    @Get('marketPlaceAnalytics')
    @ApiOperation({ summary: 'Get marketplace analytics (chart + summary + change percentages) by range' })
    @ApiQuery({
        name: 'range',
        required: false,
        enum: MarketPlaceOverviewRange,
        description: 'weekly (last 7 days) or monthly (last 30 days)',
    })
    async getMarketPlaceAnalytics(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: MarketPlaceOverviewFilterDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.dashboardService.getMarketPlaceAnalytics(userId, query);
    }

    @Get('recent-orders')
    @ApiOperation({ summary: 'Get seller recent orders' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    async getRecentOrders(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: DashboardPaginationDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.dashboardService.getRecentOrders(userId, query);
    }

    @Get('items')
    @ApiOperation({ summary: 'Get seller closet items for dashboard' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'category', required: false, example: 'Shoes' })
    @ApiQuery({ name: 'isActive', required: false, example: true })
    async getItems(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: DashboardItemsQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.dashboardService.getClosetItems(userId, query);
    }
}
