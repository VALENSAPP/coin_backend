import {
    Delete,
    Get,
    ParseUUIDPipe,
    Param,
    Patch,
    Query,
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateMarketplaceBattleDto } from './dto/create-marketplace-battle.dto';
import { ChallengeMarketplaceBattleDto } from './dto/challenge-marketplace-battle.dto';
import { CreateMarketplaceBattleCommentDto } from './dto/create-marketplace-battle-comment.dto';
import { MarketplaceBattleCommentsQueryDto } from './dto/marketplace-battle-comments-query.dto';
import { MarketplaceBattleListQueryDto } from './dto/marketplace-battle-list-query.dto';
import { PublishMarketplaceBattleDto } from './dto/publish-marketplace-battle.dto';
import { UpdateMarketplaceBattleDto } from './dto/update-marketplace-battle.dto';
import { VoteMarketplaceBattleDto } from './dto/vote-marketplace-battle.dto';
import { MarketplaceBattlesService } from './marketplace-battles.service';

@ApiTags('marketplace-battles')
@Controller('marketplace-battles')
export class MarketplaceBattlesController {
    constructor(
        private readonly marketplaceBattlesService: MarketplaceBattlesService,
    ) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create draft marketplace battle with exactly two products' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiBadRequestResponse({ description: 'Validation or business-rule error' })
    @ApiNotFoundResponse({ description: 'Mycloset not found' })
    async createDraftBattle(
        @Req() req: Request,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: CreateMarketplaceBattleDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.createDraftBattle(userId, dto);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List authenticated seller marketplace battles' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'] })
    @ApiQuery({ name: 'category', required: false, example: 'Fashion' })
    @ApiQuery({ name: 'search', required: false, example: 'summer' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'startAt', 'endAt', 'totalVotes', 'totalComments'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiBadRequestResponse({ description: 'Invalid query parameters' })
    async listMyBattles(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true }))
        query: MarketplaceBattleListQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.listMyBattles(userId, query);
    }

    @Get('me/:battleId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get one seller-owned marketplace battle details' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    async getMyBattleById(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.getMyBattleById(userId, battleId);
    }

    @Patch(':battleId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update draft seller marketplace battle' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({ description: 'Invalid update payload or battle is not draft' })
    async updateDraftBattle(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: UpdateMarketplaceBattleDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.updateDraftBattle(userId, battleId, dto);
    }

    @Delete(':battleId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Hard delete draft seller marketplace battle' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({ description: 'Only draft marketplace battles can be deleted' })
    async deleteDraftBattle(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.deleteDraftBattle(userId, battleId);
    }

    @Post(':battleId/publish')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Publish a draft marketplace battle as LIVE or SCHEDULED' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({
        description:
            'Invalid dates, invalid participants/products, or battle not in DRAFT status',
    })
    async publishDraftBattle(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: PublishMarketplaceBattleDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.publishDraftBattle(userId, battleId, dto);
    }

    @Post(':battleId/challenge')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create a draft marketplace challenge battle from a completed winner battle (Step 11)',
        description:
            'Seller-only endpoint. Creates a new DRAFT battle using the stored winner product from the source COMPLETED WINNER battle versus a challenger product from the same closet.',
    })
    @ApiParam({ name: 'battleId', description: 'Source marketplace battle id' })
    @ApiCreatedResponse({
        description: 'Marketplace challenge battle created successfully',
        schema: {
            example: {
                message: 'Marketplace challenge battle created successfully',
                sourceBattle: {
                    id: 'battle-source-1',
                    winnerParticipantId: 'participant-winner-1',
                    winnerProductId: 'product-winner-1',
                },
                battle: {
                    id: 'battle-new-1',
                    title: 'Can the Champion Win Again?',
                    description: 'The previous winner faces another product',
                    category: 'Fashion',
                    status: 'DRAFT',
                    outcome: 'PENDING',
                    startAt: null,
                    endAt: null,
                    publishedAt: null,
                    completedAt: null,
                    winnerParticipantId: null,
                    totalVotes: 0,
                    totalComments: 0,
                    participants: [
                        {
                            position: 1,
                            voteCount: 0,
                            isWinner: false,
                            product: {
                                id: 'product-winner-1',
                                name: 'Previous Winner',
                            },
                        },
                        {
                            position: 2,
                            voteCount: 0,
                            isWinner: false,
                            product: {
                                id: 'product-challenger-1',
                                name: 'New Challenger',
                            },
                        },
                    ],
                },
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: source battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({
        description:
            'Source battle is not COMPLETED WINNER, products are invalid/ineligible, or challenger equals winner product',
    })
    async createChallengeBattle(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: ChallengeMarketplaceBattleDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.createChallengeBattle(userId, battleId, dto);
    }

    @Post(':battleId/cancel')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cancel a seller-owned published marketplace battle (Step 12)',
        description:
            'Allows cancellation only for SCHEDULED or LIVE marketplace battles. DRAFT must be deleted via draft delete endpoint. COMPLETED and already CANCELLED battles cannot be cancelled.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiOkResponse({
        description: 'Marketplace battle cancelled successfully',
        schema: {
            example: {
                message: 'Marketplace battle cancelled successfully',
                battle: {
                    id: 'battle-123',
                    status: 'CANCELLED',
                    outcome: 'CANCELLED',
                    startAt: '2026-07-06T10:00:00.000Z',
                    endAt: '2026-07-06T11:00:00.000Z',
                    publishedAt: '2026-07-06T09:55:00.000Z',
                    completedAt: null,
                    winnerParticipantId: null,
                    totalVotes: 25,
                    totalComments: 8,
                    participants: [
                        {
                            id: 'participant-1',
                            position: 1,
                            voteCount: 15,
                            isWinner: false,
                            product: {
                                id: 'product-1',
                                name: 'Product A',
                            },
                        },
                        {
                            id: 'participant-2',
                            position: 2,
                            voteCount: 10,
                            isWinner: false,
                            product: {
                                id: 'product-2',
                                name: 'Product B',
                            },
                        },
                    ],
                },
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({
        description:
            'Battle status cannot be cancelled (DRAFT/COMPLETED), battle already cancelled, or participant integrity validation failed',
    })
    @ApiConflictResponse({ description: 'Battle is already cancelled or no longer cancellable' })
    async cancelBattle(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.cancelMarketplaceBattle(userId, battleId);
    }

    @Post(':battleId/vote')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Vote in a live marketplace battle' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Sellers cannot vote in their own marketplace battle' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({
        description:
            'Voting window invalid, battle status invalid, or participant invalid/not eligible',
    })
    @ApiConflictResponse({ description: 'You have already voted in this marketplace battle' })
    async voteBattle(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: VoteMarketplaceBattleDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.voteMarketplaceBattle(userId, battleId, dto);
    }

    @Delete(':battleId/vote')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remove authenticated user vote from a live marketplace battle' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or no existing vote' })
    @ApiBadRequestResponse({ description: 'Voting window invalid or battle status invalid' })
    async removeBattleVote(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.removeMarketplaceBattleVote(userId, battleId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':battleId/comments')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Add a marketplace battle comment (Step 8)',
        description: 'Adds a comment to a live marketplace battle during the active window.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiCreatedResponse({
        description: 'Comment created successfully',
        schema: {
            example: {
                message: 'Comment added successfully',
                totalComments: 8,
                comment: {
                    id: '1a2b3c4d-1111-2222-3333-444455556666',
                    comment: 'This one has better value',
                    createdAt: '2025-09-01T10:00:00.000Z',
                    updatedAt: '2025-09-01T10:00:00.000Z',
                    user: {
                        id: '9a9b9c9d-7777-8888-9999-000011112222',
                        name: 'John Doe',
                        profileImage: 'https://cdn.example.com/avatar.png',
                    },
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Battle is not live, window closed, or payload validation failed',
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    async createComment(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: CreateMarketplaceBattleCommentDto,
    ) {
        return this.marketplaceBattlesService.createMarketplaceBattleComment(
            req.user.userId,
            battleId,
            dto,
        );
    }

    @Get(':battleId/comments')
    @ApiOperation({
        summary: 'List marketplace battle comments (Step 8)',
        description: 'Returns paginated public comments for live or completed marketplace battles.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({
        name: 'sortOrder',
        required: false,
        enum: ['asc', 'desc'],
        example: 'desc',
    })
    @ApiOkResponse({
        description: 'Comments retrieved successfully',
        schema: {
            example: {
                comments: [
                    {
                        id: '1a2b3c4d-1111-2222-3333-444455556666',
                        comment: 'Great battle',
                        createdAt: '2025-09-01T10:00:00.000Z',
                        updatedAt: '2025-09-01T10:00:00.000Z',
                        user: {
                            id: '9a9b9c9d-7777-8888-9999-000011112222',
                            name: 'John Doe',
                            profileImage: 'https://cdn.example.com/avatar.png',
                        },
                    },
                ],
                total: 35,
                page: 1,
                limit: 20,
                totalPages: 2,
            },
        },
    })
    @ApiBadRequestResponse({ description: 'Invalid query parameters' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not publicly visible' })
    async listComments(
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Query(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        query: MarketplaceBattleCommentsQueryDto,
    ) {
        return this.marketplaceBattlesService.listMarketplaceBattleComments(
            battleId,
            query,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':battleId/comments/:commentId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Delete own marketplace battle comment (Step 8)',
        description: 'Soft deletes the authenticated user comment and decrements totalComments.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiParam({ name: 'commentId', description: 'Marketplace battle comment UUID' })
    @ApiOkResponse({
        description: 'Comment deleted successfully',
        schema: {
            example: {
                message: 'Comment deleted successfully',
                commentId: '1a2b3c4d-1111-2222-3333-444455556666',
                totalComments: 7,
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Battle status does not allow deletion',
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Attempt to delete another user comment' })
    @ApiNotFoundResponse({ description: 'Marketplace battle or comment not found' })
    @ApiConflictResponse({ description: 'Comment already deleted' })
    async deleteComment(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
    ) {
        return this.marketplaceBattlesService.deleteMarketplaceBattleComment(
            req.user.userId,
            battleId,
            commentId,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':battleId/insights')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get seller insights for completed marketplace battle (Step 9)',
        description:
            'Seller-only read endpoint for COMPLETED marketplace battles. Returns insights derived only from stored final counters and participant vote results.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiOkResponse({
        description: 'Marketplace battle insights returned successfully',
        schema: {
            example: {
                battleId: 'battle-123',
                title: 'Summer Style Battle',
                status: 'COMPLETED',
                outcome: 'WINNER',
                startAt: '2026-07-05T10:00:00.000Z',
                endAt: '2026-07-06T10:00:00.000Z',
                completedAt: '2026-07-06T10:00:01.000Z',
                durationSeconds: 86400,
                totalVotes: 100,
                totalComments: 25,
                engagementCount: 125,
                participants: [
                    {
                        participantId: 'participant-1',
                        position: 1,
                        product: {
                            id: 'product-1',
                            name: 'Blue Dress',
                            images: ['https://cdn.example.com/p1.jpg'],
                        },
                        voteCount: 60,
                        votePercentage: 60,
                        isWinner: true,
                    },
                    {
                        participantId: 'participant-2',
                        position: 2,
                        product: {
                            id: 'product-2',
                            name: 'Red Dress',
                            images: ['https://cdn.example.com/p2.jpg'],
                        },
                        voteCount: 40,
                        votePercentage: 40,
                        isWinner: false,
                    },
                ],
                winner: {
                    participantId: 'participant-1',
                    product: {
                        id: 'product-1',
                        name: 'Blue Dress',
                        images: ['https://cdn.example.com/p1.jpg'],
                    },
                    voteCount: 60,
                    votePercentage: 60,
                },
                loser: {
                    participantId: 'participant-2',
                    product: {
                        id: 'product-2',
                        name: 'Red Dress',
                        images: ['https://cdn.example.com/p2.jpg'],
                    },
                    voteCount: 40,
                    votePercentage: 40,
                },
                voteDifference: 20,
                winningMarginPercentagePoints: 20,
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not completed' })
    async getBattleInsights(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        return this.marketplaceBattlesService.getMarketplaceBattleInsights(
            req.user.userId,
            battleId,
        );
    }
}
