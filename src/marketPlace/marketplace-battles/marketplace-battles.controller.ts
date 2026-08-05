import {
    Delete,
    Get,
    ParseUUIDPipe,
    Param,
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
import { CreateCrossShopChallengeDto } from './dto/create-cross-shop-challenge.dto';
import { CreateMarketplaceBattleDto } from './dto/create-marketplace-battle.dto';
import { CreateMarketplaceBattleCommentDto } from './dto/create-marketplace-battle-comment.dto';
import { ReactMarketplaceBattleCommentDto } from './dto/react-marketplace-battle-comment.dto';
import { CreateMarketplaceWinnerPromotionDto } from './dto/create-marketplace-winner-promotion.dto';
import { MarketplaceBattleChallengeListQueryDto } from './dto/marketplace-battle-challenge-list-query.dto';
import { MarketplaceBattleCommentsQueryDto } from './dto/marketplace-battle-comments-query.dto';
import { MarketplaceBattleListQueryDto } from './dto/marketplace-battle-list-query.dto';
import { MarketplaceBattleVotersQueryDto } from './dto/marketplace-battle-voters-query.dto';
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
    @ApiOperation({
        summary: 'Create and publish marketplace battle with exactly two products',
        description:
            'Direct publish flow. If startAt is omitted or now/past, battle starts as LIVE; if startAt is in the future, battle is created as SCHEDULED.',
    })
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

    @Post('challenge')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Challenge another shop to a cross-shop marketplace battle',
        description:
            'Creates a PENDING_INVITE battle between your product and an opponent shop product. Optional platform-points stake is locked from the challenger until accept/decline/expire/complete.',
    })
    @ApiCreatedResponse({ description: 'Challenge created and invite sent' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiBadRequestResponse({ description: 'Validation or business-rule error' })
    @ApiNotFoundResponse({ description: 'Closet or product not found' })
    async createCrossShopChallenge(
        @Req() req: Request,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: CreateCrossShopChallengeDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.createCrossShopChallenge(userId, dto);
    }

    @Get('challenges/incoming')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List pending incoming cross-shop battle challenges' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    async listIncomingChallenges(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true }))
        query: MarketplaceBattleChallengeListQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.listIncomingChallenges(userId, query);
    }

    @Get('challenges/outgoing')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List outgoing cross-shop battle challenges' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    async listOutgoingChallenges(
        @Req() req: Request,
        @Query(new ValidationPipe({ whitelist: true, transform: true }))
        query: MarketplaceBattleChallengeListQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.listOutgoingChallenges(userId, query);
    }

    @Get(':battleId/challenge')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get cross-shop battle challenge status',
        description:
            'Returns invite and battle status for a cross-shop challenge. Available to the challenger or invited seller. Use inviteStatus to know if the challenge is PENDING, ACCEPTED, DECLINED, or CANCELED.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiOkResponse({ description: 'Challenge status retrieved' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Caller is not a party to this challenge' })
    @ApiNotFoundResponse({ description: 'Challenge invite not found' })
    async getCrossShopChallengeStatus(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.getCrossShopChallengeStatus(userId, battleId);
    }

    @Post(':battleId/challenge/accept')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Accept a pending cross-shop battle challenge' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    async acceptCrossShopChallenge(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.acceptCrossShopChallenge(userId, battleId);
    }

    @Post(':battleId/challenge/decline')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Decline a pending cross-shop battle challenge' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    async declineCrossShopChallenge(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.declineCrossShopChallenge(userId, battleId);
    }

    @Post(':battleId/challenge/cancel')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel your pending outgoing cross-shop battle challenge' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    async cancelCrossShopChallenge(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.cancelCrossShopChallenge(userId, battleId);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List authenticated seller marketplace battles' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
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

    @Get('marketPlaceBattleOverview')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary:
            'Get authenticated seller marketplace battle overview (total created battles, votes, and views)',
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    async getMarketPlaceBattleOverview(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.getMarketPlaceBattleOverview(userId);
    }

    @Get('me/:battleId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get one marketplace battle details for authenticated user' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not publicly visible' })
    async getMyBattleById(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.getMyBattleById(userId, battleId);
    }

    @Post(':battleId/view')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Track one unique marketplace battle view per authenticated user' })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle id' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not publicly visible' })
    async trackBattleView(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.trackMarketplaceBattleView(userId, battleId);
    }

    @Post(':battleId/cancel')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Cancel a seller-owned published marketplace battle (Step 12)',
        description:
            'Allows cancellation only for SCHEDULED or LIVE marketplace battles. COMPLETED and already CANCELLED battles cannot be cancelled.',
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
    @ApiForbiddenResponse({ description: 'Only followers can vote in this marketplace battle' })
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

    @Get(':battleId/voters')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'List voters for a marketplace battle',
        description:
            'Returns paginated voter list with selected participant and product details for authenticated users who can view the battle.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
    @ApiOkResponse({
        description: 'Marketplace battle voters retrieved successfully',
        schema: {
            example: {
                battleId: '718451bf-0775-4d17-ac3a-7d6960ecb68d',
                total: 2,
                page: 1,
                limit: 20,
                totalPages: 1,
                voters: [
                    {
                        voteId: '0f8fad5b-d9cb-469f-a165-70867728950e',
                        votedAt: '2026-07-07T09:12:00.000Z',
                        user: {
                            id: '9a9b9c9d-7777-8888-9999-000011112222',
                            name: 'John Doe',
                            profileImage: 'https://cdn.example.com/avatar.png',
                        },
                        participant: {
                            id: '1a2b3c4d-1111-2222-3333-444455556666',
                            position: 1,
                            product: {
                                id: 'product-1',
                                name: 'Blue Dress',
                                images: ['https://cdn.example.com/p1.jpg'],
                            },
                        },
                    },
                ],
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({ description: 'Invalid query parameters' })
    async listBattleVoters(
        @Req() req: Request,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Query(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        query: MarketplaceBattleVotersQueryDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.marketplaceBattlesService.listMarketplaceBattleVoters(userId, battleId, query);
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

    @UseGuards(AuthGuard('jwt'))
    @Post(':battleId/comments/:commentId/reaction')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Like, dislike, or remove reaction on marketplace battle comment',
        description: 'Use LIKE or DISLIKE to set reaction, or NONE to remove current reaction.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiParam({ name: 'commentId', description: 'Marketplace battle comment UUID' })
    @ApiCreatedResponse({
        description: 'Marketplace battle comment reaction updated successfully',
        schema: {
            example: {
                message: 'Reaction updated successfully',
                battleId: 'battle-uuid',
                commentId: 'comment-uuid',
                userReaction: 'LIKE',
                likeCount: 12,
                dislikeCount: 3,
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiNotFoundResponse({ description: 'Marketplace battle or comment not found' })
    @ApiBadRequestResponse({ description: 'Invalid payload or battle status' })
    async reactComment(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: ReactMarketplaceBattleCommentDto,
    ) {
        return this.marketplaceBattlesService.reactMarketplaceBattleComment(
            req.user.userId,
            battleId,
            commentId,
            dto.reaction,
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
        summary: 'Get marketplace battle insights (Step 9)',
        description:
            'Authenticated read endpoint for marketplace battle insights. Battle owner always has access; other users can access when battle visibility rules allow. Returns live/scheduled/completed counters and participant vote stats; winner fields are populated only after completion with WINNER outcome.',
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
                viewCount: 350,
                voteCount: 100,
                commentCount: 25,
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
    @ApiNotFoundResponse({ description: 'Marketplace battle not found or not visible to the user' })
    async getBattleInsights(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    ) {
        return this.marketplaceBattlesService.getMarketplaceBattleInsights(
            req.user.userId,
            battleId,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':battleId/winner-promotion')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create a winner promotion for a completed marketplace battle',
        description:
            'Seller-only action for completed battles with a winning product. Supports multiple active promotion types at once, such as 10% off for 24 hours and free shipping.',
    })
    @ApiParam({ name: 'battleId', description: 'Marketplace battle UUID' })
    @ApiCreatedResponse({
        description: 'Winner promotion created successfully',
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'Forbidden: battle not owned by seller' })
    @ApiNotFoundResponse({ description: 'Marketplace battle not found' })
    @ApiBadRequestResponse({ description: 'already promoted, or battle/product not eligible for promotion' })
    @ApiConflictResponse({ description: 'already promoted' })
    async createWinnerPromotion(
        @Req() req: any,
        @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
        @Body(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        )
        dto: CreateMarketplaceWinnerPromotionDto,
    ) {
        return this.marketplaceBattlesService.createWinnerPromotion(
            req.user.userId,
            battleId,
            dto,
        );
    }
}
