import {
    Controller,
    Get,
    ParseUUIDPipe,
    Param,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { ClosetMarketplaceBattlesQueryDto } from './dto/closet-marketplace-battles-query.dto';
import { MarketplaceBattleExploreQueryDto } from './dto/marketplace-battle-explore-query.dto';
import { MarketplaceBattleWinnersQueryDto } from './dto/marketplace-battle-winners-query.dto';
import { MarketplaceBattlesService } from './marketplace-battles.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@ApiTags('marketplace-battles-public')
@Controller()
export class MarketplaceBattlesPublicController {
    constructor(private readonly marketplaceBattlesService: MarketplaceBattlesService) { }

    @Get('marketplace-battles/explore')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Explore public LIVE marketplace battles' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'category', required: false, example: 'Fashion' })
    @ApiQuery({ name: 'search', required: false, example: 'summer' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['publishedAt', 'createdAt', 'endAt', 'totalVotes', 'totalComments'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiBadRequestResponse({ description: 'Invalid query parameters' })
    async exploreBattles(
        @Req() req: any,
        @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
        query: MarketplaceBattleExploreQueryDto,
    ) {
        return this.marketplaceBattlesService.explorePublicBattles(query, req?.user?.userId);
    }

    @Get('mycloset/:closetId/marketplace-battles')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get public marketplace battles for a closet' })
    @ApiParam({ name: 'closetId', description: 'Closet id' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: ['SCHEDULED', 'LIVE', 'COMPLETED'] })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['publishedAt', 'createdAt', 'startAt', 'endAt', 'totalVotes', 'totalComments'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiBadRequestResponse({ description: 'Invalid query parameters' })
    @ApiNotFoundResponse({ description: 'Mycloset not found' })
    async getClosetBattles(
        @Req() req: any,
        @Param('closetId', new ParseUUIDPipe({ version: '4' })) closetId: string,
        @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
        query: ClosetMarketplaceBattlesQueryDto,
    ) {
        return this.marketplaceBattlesService.getClosetPublicBattles(closetId, query, req?.user?.userId);
    }

    @Get('mycloset/:closetId/marketplace-battle-winners')
    @ApiOperation({
        summary: 'Get unique winning products for a closet marketplace-battle winner carousel (Step 10)',
        description:
            'Public read-only endpoint. Aggregates unique winning products from COMPLETED WINNER marketplace battles using stored lifecycle results only. Malformed historical battles are skipped with server-side logging. Product fields reflect current ClosetItems relation data (no historical snapshot table).',
    })
    @ApiParam({ name: 'closetId', description: 'Closet id' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['completedAt', 'createdAt', 'totalVotes', 'totalComments'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiOkResponse({
        description: 'Closet winner products fetched successfully',
        schema: {
            example: {
                winners: [
                    {
                        product: {
                            id: 'product-1',
                            name: 'Blue Jacket',
                            images: ['https://cdn.example.com/p1.jpg'],
                            price: 45,
                            category: 'Fashion',
                            brand: 'Brand A',
                            condition: 'NEW',
                        },
                        winCount: 3,
                        latestWinAt: '2026-07-20T10:00:00.000Z',
                        latestBattle: {
                            id: 'battle-123',
                            title: 'Summer Style Battle',
                            completedAt: '2026-07-20T10:00:00.000Z',
                            totalVotes: 100,
                            totalComments: 20,
                        },
                        latestVoteCount: 60,
                        latestVotePercentage: 60,
                        totalVotesAcrossWins: 180,
                    },
                ],
                total: 12,
                page: 1,
                limit: 10,
                totalPages: 2,
            },
        },
    })
    @ApiBadRequestResponse({ description: 'Invalid query parameters' })
    @ApiNotFoundResponse({ description: 'Mycloset not found' })
    async getClosetBattleWinners(
        @Param('closetId', new ParseUUIDPipe({ version: '4' })) closetId: string,
        @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
        query: MarketplaceBattleWinnersQueryDto,
    ) {
        return this.marketplaceBattlesService.getClosetMarketplaceBattleWinners(closetId, query);
    }

    @Get('marketplace-battles/public/:battleId')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get public marketplace battle details' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not publicly visible' })
    async getPublicBattleById(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        return this.marketplaceBattlesService.getPublicBattleById(battleId, req?.user?.userId);
    }

    @Get('marketplace-battles/:battleId/results')
    @ApiOperation({
        summary: 'Get completed marketplace battle final results (Step 9)',
        description:
            'Public read-only endpoint for COMPLETED marketplace battle results. Uses stored lifecycle outcome and counters without recalculation.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiOkResponse({
        description: 'Completed marketplace battle results fetched successfully',
        schema: {
            example: {
                id: 'battle-123',
                title: 'Summer Style Battle',
                description: 'Choose the best look',
                category: 'Fashion',
                status: 'COMPLETED',
                outcome: 'WINNER',
                startAt: '2026-07-05T10:00:00.000Z',
                endAt: '2026-07-06T10:00:00.000Z',
                publishedAt: '2026-07-05T09:50:00.000Z',
                completedAt: '2026-07-06T10:00:01.000Z',
                durationSeconds: 86400,
                totalVotes: 100,
                totalComments: 25,
                voteDifference: 20,
                seller: {
                    id: 'seller-1',
                    name: 'Seller One',
                    profileImage: 'https://cdn.example.com/seller.jpg',
                },
                closet: {
                    id: 'closet-1',
                    shopName: 'My Shop',
                    shopUsername: 'myshop',
                    shopLogo: 'https://cdn.example.com/logo.jpg',
                },
                participants: [
                    {
                        id: 'participant-1',
                        position: 1,
                        voteCount: 60,
                        votePercentage: 60,
                        isWinner: true,
                        product: {
                            id: 'product-1',
                            name: 'Blue Dress',
                            images: ['https://cdn.example.com/p1.jpg'],
                            price: 100,
                            category: 'Fashion',
                            brand: 'Brand A',
                            condition: 'NEW',
                        },
                    },
                    {
                        id: 'participant-2',
                        position: 2,
                        voteCount: 40,
                        votePercentage: 40,
                        isWinner: false,
                        product: {
                            id: 'product-2',
                            name: 'Red Dress',
                            images: ['https://cdn.example.com/p2.jpg'],
                            price: 90,
                            category: 'Fashion',
                            brand: 'Brand B',
                            condition: 'NEW',
                        },
                    },
                ],
                winner: {
                    participantId: 'participant-1',
                    product: {
                        id: 'product-1',
                        name: 'Blue Dress',
                        images: ['https://cdn.example.com/p1.jpg'],
                        price: 100,
                        category: 'Fashion',
                        brand: 'Brand A',
                        condition: 'NEW',
                    },
                },
            },
        },
    })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not completed' })
    @ApiBadRequestResponse({ description: 'Invalid battle id format' })
    async getBattleResults(@Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string) {
        return this.marketplaceBattlesService.getMarketplaceBattleResults(battleId);
    }
}
