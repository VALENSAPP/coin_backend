import { Controller, Get, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { EarningsHistoryQueryDto } from './dto/earnings-history-query.dto';
import { EarningsService } from './earnings.service';

@ApiTags('seller-earnings')
@Controller('earnings')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class EarningsController {
    constructor(private readonly earningsService: EarningsService) { }

    @Get('balance')
    @ApiOperation({
        summary: 'Get live seller wallet balance (pending + available/withdrawable)',
    })
    async getBalance(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.earningsService.getBalance(userId);
    }

    @Get()
    @ApiOperation({ summary: 'Get earnings summary for authenticated seller' })
    async getSummary(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.earningsService.getSummary(userId);
    }

    @Get('history')
    @ApiOperation({ summary: 'Get earnings history for authenticated seller' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    async getHistory(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: EarningsHistoryQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.earningsService.getHistory(userId, query);
    }
}
