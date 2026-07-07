import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    FollowStatus,
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
    Prisma,
    WhoCanBuy,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMarketplaceBattleDto } from './dto/create-marketplace-battle.dto';
import { ChallengeMarketplaceBattleDto } from './dto/challenge-marketplace-battle.dto';
import {
    ClosetMarketplaceBattlesQueryDto,
    ClosetMarketplaceBattleSortField,
    ClosetMarketplaceBattlePublicStatus,
} from './dto/closet-marketplace-battles-query.dto';
import {
    MarketplaceBattleListQueryDto,
    MarketplaceBattleSortField,
} from './dto/marketplace-battle-list-query.dto';
import {
    MarketplaceBattleExploreQueryDto,
    MarketplaceBattleExploreSortField,
} from './dto/marketplace-battle-explore-query.dto';
import {
    MarketplaceBattleWinnersQueryDto,
    MarketplaceBattleWinnersSortField,
} from './dto/marketplace-battle-winners-query.dto';
import { NotificationService } from '../../notification/notification.service';
import { CreateMarketplaceBattleCommentDto } from './dto/create-marketplace-battle-comment.dto';
import { MarketplaceBattleCommentsQueryDto } from './dto/marketplace-battle-comments-query.dto';
import { PublishMarketplaceBattleDto } from './dto/publish-marketplace-battle.dto';
import { UpdateMarketplaceBattleDto } from './dto/update-marketplace-battle.dto';
import { VoteMarketplaceBattleDto } from './dto/vote-marketplace-battle.dto';

type PrismaTx = PrismaService | Prisma.TransactionClient;

const MARKETPLACE_BATTLE_PRODUCT_SELECT = {
    id: true,
    closetId: true,
    userId: true,
    images: true,
    name: true,
    category: true,
    brand: true,
    condition: true,
    description: true,
    price: true,
    quantity: true,
    isActive: true,
    isDeleted: true,
    shippingOption: true,
    shippingFee: true,
    estimateShippingTime: true,
    pickupAddress: true,
    pickupAvailableHours: true,
    buyerChatEnabled: true,
    returnPolicy: true,
    createdAt: true,
    updatedAt: true,
} as const;

const MARKETPLACE_BATTLE_LIST_PRODUCT_SELECT = {
    id: true,
    images: true,
    name: true,
    category: true,
    price: true,
    quantity: true,
    isActive: true,
    isDeleted: true,
} as const;

const MARKETPLACE_BATTLE_BASE_SELECT = {
    id: true,
    sellerId: true,
    closetId: true,
    title: true,
    description: true,
    category: true,
    visibility: true,
    whoCanVote: true,
    shareToFeed: true,
    status: true,
    outcome: true,
    startAt: true,
    endAt: true,
    publishedAt: true,
    completedAt: true,
    winnerParticipantId: true,
    totalVotes: true,
    totalComments: true,
    createdAt: true,
    updatedAt: true,
} as const;

const MARKETPLACE_BATTLE_SORT_FIELD_MAP: Record<
    MarketplaceBattleSortField,
    Prisma.MarketplaceBattleOrderByWithRelationInput
> = {
    createdAt: { createdAt: 'desc' },
    updatedAt: { updatedAt: 'desc' },
    startAt: { startAt: 'desc' },
    endAt: { endAt: 'desc' },
    totalVotes: { totalVotes: 'desc' },
    totalComments: { totalComments: 'desc' },
};

const MARKETPLACE_BATTLE_EXPLORE_SORT_FIELD_MAP: Record<
    MarketplaceBattleExploreSortField,
    Prisma.MarketplaceBattleOrderByWithRelationInput
> = {
    publishedAt: { publishedAt: 'desc' },
    createdAt: { createdAt: 'desc' },
    endAt: { endAt: 'desc' },
    totalVotes: { totalVotes: 'desc' },
    totalComments: { totalComments: 'desc' },
};

const CLOSET_MARKETPLACE_BATTLE_SORT_FIELD_MAP: Record<
    ClosetMarketplaceBattleSortField,
    Prisma.MarketplaceBattleOrderByWithRelationInput
> = {
    publishedAt: { publishedAt: 'desc' },
    createdAt: { createdAt: 'desc' },
    startAt: { startAt: 'desc' },
    endAt: { endAt: 'desc' },
    totalVotes: { totalVotes: 'desc' },
    totalComments: { totalComments: 'desc' },
};

const MARKETPLACE_BATTLE_WINNERS_SORT_FIELD_MAP: Record<
    MarketplaceBattleWinnersSortField,
    'latestWinAt' | 'latestBattleCreatedAt' | 'totalVotesAcrossWins' | 'totalCommentsAcrossWins'
> = {
    completedAt: 'latestWinAt',
    createdAt: 'latestBattleCreatedAt',
    totalVotes: 'totalVotesAcrossWins',
    totalComments: 'totalCommentsAcrossWins',
};

const MARKETPLACE_BATTLE_PUBLIC_SELECT = {
    id: true,
    sellerId: true,
    title: true,
    description: true,
    category: true,
    visibility: true,
    whoCanVote: true,
    shareToFeed: true,
    status: true,
    outcome: true,
    startAt: true,
    endAt: true,
    publishedAt: true,
    completedAt: true,
    winnerParticipantId: true,
    totalVotes: true,
    totalComments: true,
    createdAt: true,
    updatedAt: true,
    seller: {
        select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
        },
    },
    closet: {
        select: {
            id: true,
            shopName: true,
            shopUsername: true,
            shopLogo: true,
        },
    },
    participants: {
        orderBy: { position: 'asc' as const },
        select: {
            id: true,
            position: true,
            voteCount: true,
            isWinner: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    quantity: true,
                    category: true,
                    brand: true,
                    condition: true,
                    isActive: true,
                    isDeleted: true,
                },
            },
        },
    },
    winnerParticipant: {
        select: {
            id: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    quantity: true,
                    category: true,
                    brand: true,
                    condition: true,
                    isActive: true,
                    isDeleted: true,
                },
            },
        },
    },
} as const;

const MARKETPLACE_BATTLE_COMMENT_AUTHOR_SELECT = {
    id: true,
    displayName: true,
    userName: true,
    image: true,
} as const;

const MARKETPLACE_BATTLE_COMPLETED_RESULT_SELECT = {
    id: true,
    sellerId: true,
    title: true,
    description: true,
    category: true,
    status: true,
    outcome: true,
    startAt: true,
    endAt: true,
    publishedAt: true,
    completedAt: true,
    winnerParticipantId: true,
    totalVotes: true,
    totalComments: true,
    seller: {
        select: {
            id: true,
            displayName: true,
            userName: true,
            image: true,
        },
    },
    closet: {
        select: {
            id: true,
            shopName: true,
            shopUsername: true,
            shopLogo: true,
        },
    },
    participants: {
        orderBy: { position: 'asc' as const },
        select: {
            id: true,
            battleId: true,
            productId: true,
            position: true,
            voteCount: true,
            isWinner: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    category: true,
                    brand: true,
                    condition: true,
                },
            },
        },
    },
    winnerParticipant: {
        select: {
            id: true,
            battleId: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    category: true,
                    brand: true,
                    condition: true,
                },
            },
        },
    },
} as const;

const MARKETPLACE_BATTLE_WINNER_CAROUSEL_SELECT = {
    id: true,
    title: true,
    status: true,
    outcome: true,
    createdAt: true,
    startAt: true,
    endAt: true,
    completedAt: true,
    winnerParticipantId: true,
    totalVotes: true,
    totalComments: true,
    participants: {
        orderBy: { position: 'asc' as const },
        select: {
            id: true,
            battleId: true,
            productId: true,
            position: true,
            voteCount: true,
            isWinner: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    category: true,
                    brand: true,
                    condition: true,
                    isActive: true,
                    isDeleted: true,
                },
            },
        },
    },
    winnerParticipant: {
        select: {
            id: true,
            battleId: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    category: true,
                    brand: true,
                    condition: true,
                    isActive: true,
                    isDeleted: true,
                },
            },
        },
    },
} as const;

const MARKETPLACE_BATTLE_CHALLENGE_SOURCE_SELECT = {
    id: true,
    sellerId: true,
    closetId: true,
    title: true,
    category: true,
    status: true,
    outcome: true,
    startAt: true,
    endAt: true,
    completedAt: true,
    winnerParticipantId: true,
    totalVotes: true,
    totalComments: true,
    participants: {
        orderBy: { position: 'asc' as const },
        select: {
            id: true,
            battleId: true,
            productId: true,
            position: true,
            voteCount: true,
            isWinner: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    category: true,
                    brand: true,
                    condition: true,
                },
            },
        },
    },
    winnerParticipant: {
        select: {
            id: true,
            battleId: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                    category: true,
                    brand: true,
                    condition: true,
                },
            },
        },
    },
} as const;

const PAST_START_TOLERANCE_MS = 60_000;
const MARKETPLACE_BATTLE_WINNERS_FETCH_CHUNK_SIZE = 100;

type CompletedBattleIntegrityInput = {
    id: string;
    status: MarketplaceBattleStatus;
    outcome: MarketplaceBattleOutcome;
    startAt: Date | null;
    endAt: Date | null;
    completedAt: Date | null;
    winnerParticipantId: string | null;
    totalVotes: number;
    totalComments: number;
    participants: Array<{
        id: string;
        battleId: string;
        productId: string;
        position: number;
        voteCount: number;
        isWinner: boolean;
        product: {
            id: string;
            name: string;
            images: string[];
            price: number;
            category: string;
            brand: string | null;
            condition: string;
        };
    }>;
    winnerParticipant: {
        id: string;
        battleId: string;
        product: {
            id: string;
            name: string;
            images: string[];
            price: number;
            category: string;
            brand: string | null;
            condition: string;
        };
    } | null;
};

@Injectable()
export class MarketplaceBattlesService {
    private readonly logger = new Logger(MarketplaceBattlesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) { }

    private async createMarketplaceBattleNotification(
        tx: PrismaTx,
        payload: {
            userId: string;
            type: string;
            title: string;
            body: string;
            dedupeKey: string;
            metadata?: Record<string, any>;
        },
    ): Promise<void> {
        await this.notificationService.createInAppNotificationIfAbsent(tx, payload);
    }

    private assertSellerUserId(userId?: string): string {
        if (!userId) throw new UnauthorizedException('User not authenticated');
        return userId;
    }

    private getSortOrder(
        sortByRaw: MarketplaceBattleSortField | undefined,
        sortOrderRaw: 'asc' | 'desc' | undefined,
    ): Prisma.MarketplaceBattleOrderByWithRelationInput {
        const safeSortBy: MarketplaceBattleSortField =
            sortByRaw && Object.prototype.hasOwnProperty.call(MARKETPLACE_BATTLE_SORT_FIELD_MAP, sortByRaw)
                ? sortByRaw
                : 'createdAt';
        const safeSortOrder: 'asc' | 'desc' = sortOrderRaw === 'asc' ? 'asc' : 'desc';

        const key = Object.keys(MARKETPLACE_BATTLE_SORT_FIELD_MAP[safeSortBy])[0] as MarketplaceBattleSortField;
        return { [key]: safeSortOrder };
    }

    private getExploreSortOrder(
        sortByRaw: MarketplaceBattleExploreSortField | undefined,
        sortOrderRaw: 'asc' | 'desc' | undefined,
    ): Prisma.MarketplaceBattleOrderByWithRelationInput {
        const safeSortBy: MarketplaceBattleExploreSortField =
            sortByRaw && Object.prototype.hasOwnProperty.call(MARKETPLACE_BATTLE_EXPLORE_SORT_FIELD_MAP, sortByRaw)
                ? sortByRaw
                : 'publishedAt';
        const safeSortOrder: 'asc' | 'desc' = sortOrderRaw === 'asc' ? 'asc' : 'desc';

        const key = Object.keys(MARKETPLACE_BATTLE_EXPLORE_SORT_FIELD_MAP[safeSortBy])[0] as MarketplaceBattleExploreSortField;
        return { [key]: safeSortOrder };
    }

    private getClosetSortOrder(
        sortByRaw: ClosetMarketplaceBattleSortField | undefined,
        sortOrderRaw: 'asc' | 'desc' | undefined,
    ): Prisma.MarketplaceBattleOrderByWithRelationInput {
        const safeSortBy: ClosetMarketplaceBattleSortField =
            sortByRaw && Object.prototype.hasOwnProperty.call(CLOSET_MARKETPLACE_BATTLE_SORT_FIELD_MAP, sortByRaw)
                ? sortByRaw
                : 'publishedAt';
        const safeSortOrder: 'asc' | 'desc' = sortOrderRaw === 'asc' ? 'asc' : 'desc';

        const key = Object.keys(CLOSET_MARKETPLACE_BATTLE_SORT_FIELD_MAP[safeSortBy])[0] as ClosetMarketplaceBattleSortField;
        return { [key]: safeSortOrder };
    }

    private roundPercentage(value: number) {
        return Number(value.toFixed(2));
    }

    private isUniqueConstraintViolation(error: unknown) {
        return Boolean(
            error &&
            typeof error === 'object' &&
            'code' in error &&
            (error as { code?: string }).code === 'P2002',
        );
    }

    private getLiveRemainingSeconds(endAt: Date | null | undefined, now: Date): number {
        if (!endAt) return 0;
        return Math.max(0, Math.floor((endAt.getTime() - now.getTime()) / 1000));
    }

    private getScheduledStartsInSeconds(startAt: Date | null | undefined, now: Date): number {
        if (!startAt) return 0;
        return Math.max(0, Math.floor((startAt.getTime() - now.getTime()) / 1000));
    }

    private async isAcceptedFollower(
        tx: Prisma.TransactionClient | PrismaService,
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        if (!followerId || !followingId) return false;
        if (followerId === followingId) return true;

        const follow = await tx.followerAndFollowing.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
            select: {
                status: true,
            },
        });

        return follow?.status === FollowStatus.ACCEPTED;
    }

    private async assertBattleVisibleToViewer(
        tx: Prisma.TransactionClient | PrismaService,
        visibility: WhoCanBuy | null | undefined,
        sellerId: string,
        viewerUserId?: string,
    ): Promise<void> {
        if (!visibility || visibility === WhoCanBuy.Everyone) return;
        if (viewerUserId && viewerUserId === sellerId) return;

        if (!viewerUserId) {
            throw new NotFoundException('Marketplace battle not found');
        }

        const isFollower = await this.isAcceptedFollower(tx, viewerUserId, sellerId);
        if (!isFollower) {
            throw new NotFoundException('Marketplace battle not found');
        }
    }

    private getVisibilityWhere(viewerUserId?: string): Prisma.MarketplaceBattleWhereInput {
        if (!viewerUserId) {
            return { visibility: WhoCanBuy.Everyone };
        }

        return {
            OR: [
                { visibility: WhoCanBuy.Everyone },
                { sellerId: viewerUserId },
                {
                    visibility: WhoCanBuy.followers,
                    seller: {
                        followers: {
                            some: {
                                followerId: viewerUserId,
                                status: FollowStatus.ACCEPTED,
                            },
                        },
                    },
                },
            ],
        };
    }

    private shouldExposeByStatusAndTime(
        battle: {
            status: string;
            startAt: Date | null;
            endAt: Date | null;
        },
        now: Date,
    ) {
        if (battle.status === 'LIVE') {
            return Boolean(battle.startAt && battle.endAt && battle.startAt <= now && battle.endAt > now);
        }

        if (battle.status === 'SCHEDULED') {
            return Boolean(battle.startAt && battle.endAt && battle.startAt > now && battle.endAt > now);
        }

        if (battle.status === 'COMPLETED') {
            return true;
        }

        return false;
    }

    private hasPubliclyEligibleProductsForActiveOrScheduled(battle: {
        status: string;
        participants: Array<{
            product: {
                isActive: boolean;
                isDeleted: boolean;
                quantity: number;
            } | null;
        }>;
    }) {
        if (battle.status === 'COMPLETED') return true;

        return battle.participants.every(
            (participant) =>
                participant.product &&
                participant.product.isActive &&
                !participant.product.isDeleted &&
                participant.product.quantity > 0,
        );
    }

    private mapPublicBattleResponse(
        battle: {
            id: string;
            sellerId: string;
            title: string;
            description: string | null;
            category: string | null;
            visibility: WhoCanBuy;
            whoCanVote: WhoCanBuy;
            shareToFeed: boolean;
            status: string;
            outcome: string;
            startAt: Date | null;
            endAt: Date | null;
            publishedAt: Date | null;
            completedAt: Date | null;
            totalVotes: number;
            totalComments: number;
            createdAt: Date;
            updatedAt: Date;
            seller: {
                id: string;
                displayName: string | null;
                userName: string | null;
                image: string | null;
            };
            closet: {
                id: string;
                shopName: string;
                shopUsername: string;
                shopLogo: string | null;
            };
            participants: Array<{
                id: string;
                position: number;
                voteCount: number;
                isWinner: boolean;
                product: {
                    id: string;
                    name: string;
                    images: string[];
                    price: number;
                    quantity: number;
                    category: string;
                    brand: string | null;
                    condition: string;
                } | null;
            }>;
            winnerParticipant?: {
                id: string;
                product: {
                    id: string;
                    name: string;
                    images: string[];
                    price: number;
                    quantity: number;
                    category: string;
                    brand: string | null;
                    condition: string;
                } | null;
            } | null;
        },
        now: Date,
    ) {
        const totalVotes = battle.totalVotes || 0;

        const participants = battle.participants
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((participant) => {
                const votePercentage =
                    totalVotes > 0
                        ? this.roundPercentage((participant.voteCount / totalVotes) * 100)
                        : 0;

                return {
                    id: participant.id,
                    position: participant.position,
                    voteCount: participant.voteCount,
                    isWinner: participant.isWinner,
                    votePercentage,
                    product: participant.product
                        ? {
                            id: participant.product.id,
                            name: participant.product.name,
                            images: participant.product.images,
                            price: participant.product.price,
                            quantity: participant.product.quantity,
                            category: participant.product.category,
                            brand: participant.product.brand,
                            condition: participant.product.condition,
                        }
                        : null,
                };
            });

        const remainingSeconds =
            battle.status === 'LIVE'
                ? this.getLiveRemainingSeconds(battle.endAt, now)
                : battle.status === 'COMPLETED'
                    ? 0
                    : null;

        const startsInSeconds =
            battle.status === 'SCHEDULED'
                ? this.getScheduledStartsInSeconds(battle.startAt, now)
                : null;

        const winner =
            battle.status === 'COMPLETED' &&
                battle.outcome === 'WINNER' &&
                battle.winnerParticipant
                ? {
                    participantId: battle.winnerParticipant.id,
                    product: battle.winnerParticipant.product
                        ? {
                            id: battle.winnerParticipant.product.id,
                            name: battle.winnerParticipant.product.name,
                            images: battle.winnerParticipant.product.images,
                            price: battle.winnerParticipant.product.price,
                            quantity: battle.winnerParticipant.product.quantity,
                            category: battle.winnerParticipant.product.category,
                            brand: battle.winnerParticipant.product.brand,
                            condition: battle.winnerParticipant.product.condition,
                        }
                        : null,
                }
                : null;

        return {
            id: battle.id,
            title: battle.title,
            description: battle.description,
            category: battle.category,
            visibility: battle.visibility,
            whoCanVote: battle.whoCanVote,
            shareToFeed: battle.shareToFeed,
            status: battle.status,
            outcome: battle.outcome,
            startAt: battle.startAt,
            endAt: battle.endAt,
            publishedAt: battle.publishedAt,
            completedAt: battle.completedAt,
            totalVotes: battle.totalVotes,
            totalComments: battle.totalComments,
            createdAt: battle.createdAt,
            updatedAt: battle.updatedAt,
            remainingSeconds,
            startsInSeconds,
            seller: {
                id: battle.seller.id,
                name: battle.seller.displayName || battle.seller.userName || 'Unknown Seller',
                profileImage: battle.seller.image,
            },
            closet: {
                id: battle.closet.id,
                shopName: battle.closet.shopName,
                shopUsername: battle.closet.shopUsername,
                shopLogo: battle.closet.shopLogo,
            },
            participants,
            winner,
        };
    }

    private async getBattleByIdOrThrow(battleId: string) {
        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: {
                id: true,
                sellerId: true,
                closetId: true,
                status: true,
            },
        });

        if (!battle) throw new NotFoundException('Marketplace battle not found');
        return battle;
    }

    private ensureVotingWindowOpen(
        battle: {
            status: MarketplaceBattleStatus;
            startAt: Date | null;
            endAt: Date | null;
        },
        now: Date,
    ) {
        if (battle.status !== MarketplaceBattleStatus.LIVE) {
            throw new BadRequestException('Voting is only allowed for live marketplace battles');
        }

        if (!battle.startAt || !battle.endAt) {
            throw new BadRequestException('Marketplace battle voting window is not configured');
        }

        if (battle.startAt > now) {
            throw new BadRequestException('Marketplace battle voting has not started yet');
        }

        if (battle.endAt <= now) {
            throw new BadRequestException('Marketplace battle voting has ended');
        }
    }

    private ensureCommentingWindowOpen(
        battle: {
            status: MarketplaceBattleStatus;
            startAt: Date | null;
            endAt: Date | null;
        },
        now: Date,
    ) {
        if (battle.status !== MarketplaceBattleStatus.LIVE) {
            throw new BadRequestException('Commenting is only allowed for live marketplace battles');
        }

        if (!battle.startAt || !battle.endAt) {
            throw new BadRequestException('Marketplace battle commenting window is not configured');
        }

        if (battle.startAt > now) {
            throw new BadRequestException('Marketplace battle commenting has not started yet');
        }

        if (battle.endAt <= now) {
            throw new BadRequestException('Marketplace battle commenting has ended');
        }
    }

    private mapPublicCommentUser(user: {
        id: string;
        displayName: string | null;
        userName: string | null;
        image: string | null;
    }) {
        return {
            id: user.id,
            name: user.displayName || user.userName || 'Unknown User',
            profileImage: user.image,
        };
    }

    private mapVoteParticipants(
        participants: Array<{ id: string; position: number; voteCount: number }>,
        totalVotes: number,
    ) {
        return participants
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((participant) => ({
                id: participant.id,
                position: participant.position,
                voteCount: participant.voteCount,
                votePercentage:
                    totalVotes > 0
                        ? this.roundPercentage((participant.voteCount / totalVotes) * 100)
                        : 0,
            }));
    }

    private throwCompletedIntegrityError(battleId: string, reason: string): never {
        this.logger.error(
            `Marketplace battle completed-data integrity failure: battle=${battleId}, reason=${reason}`,
        );
        throw new InternalServerErrorException('Marketplace battle result integrity check failed');
    }

    private async loadCompletedMarketplaceBattle(battleId: string) {
        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: MARKETPLACE_BATTLE_COMPLETED_RESULT_SELECT,
        });

        if (!battle) {
            throw new NotFoundException('Marketplace battle not found');
        }

        if (battle.status !== MarketplaceBattleStatus.COMPLETED) {
            throw new NotFoundException('Marketplace battle not found');
        }

        if (!battle.completedAt) {
            this.throwCompletedIntegrityError(battleId, 'missing_completedAt');
        }

        if (
            battle.outcome !== MarketplaceBattleOutcome.WINNER &&
            battle.outcome !== MarketplaceBattleOutcome.TIE
        ) {
            this.throwCompletedIntegrityError(
                battleId,
                `invalid_outcome_${String(battle.outcome)}`,
            );
        }

        return battle;
    }

    private validateCompletedBattleIntegrity(
        battle: CompletedBattleIntegrityInput,
    ) {
        const battleId = battle.id;
        const participants = battle.participants.slice().sort((a, b) => a.position - b.position);

        if (participants.length !== 2) {
            this.throwCompletedIntegrityError(battleId, 'participant_count_not_two');
        }

        const positions = participants.map((participant) => participant.position).sort((a, b) => a - b);
        if (positions[0] !== 1 || positions[1] !== 2) {
            this.throwCompletedIntegrityError(battleId, 'invalid_participant_positions');
        }

        const uniqueProductIds = new Set(participants.map((participant) => participant.productId));
        if (uniqueProductIds.size !== 2) {
            this.throwCompletedIntegrityError(battleId, 'duplicate_participant_products');
        }

        if (participants.some((participant) => participant.voteCount < 0)) {
            this.throwCompletedIntegrityError(battleId, 'negative_participant_vote_count');
        }

        if (battle.totalVotes < 0) {
            this.throwCompletedIntegrityError(battleId, 'negative_total_votes');
        }

        if (battle.totalComments < 0) {
            this.throwCompletedIntegrityError(battleId, 'negative_total_comments');
        }

        const participantVoteSum = participants.reduce(
            (sum, participant) => sum + participant.voteCount,
            0,
        );
        if (participantVoteSum !== battle.totalVotes) {
            this.throwCompletedIntegrityError(battleId, 'participant_vote_sum_mismatch');
        }

        if (!battle.startAt || !battle.endAt) {
            this.throwCompletedIntegrityError(battleId, 'missing_start_or_end_at');
        }

        const winnerFlagged = participants.filter((participant) => participant.isWinner);

        if (battle.outcome === MarketplaceBattleOutcome.WINNER) {
            if (!battle.winnerParticipantId) {
                this.throwCompletedIntegrityError(battleId, 'winner_outcome_with_null_winner_participant_id');
            }

            const participantIds = new Set(participants.map((participant) => participant.id));
            if (!participantIds.has(battle.winnerParticipantId)) {
                this.throwCompletedIntegrityError(battleId, 'winner_participant_not_in_battle');
            }

            if (winnerFlagged.length !== 1) {
                this.throwCompletedIntegrityError(battleId, 'winner_flag_count_invalid');
            }

            if (winnerFlagged[0].id !== battle.winnerParticipantId) {
                this.throwCompletedIntegrityError(battleId, 'winner_flag_id_mismatch');
            }

            if (!battle.winnerParticipant || battle.winnerParticipant.id !== battle.winnerParticipantId) {
                this.throwCompletedIntegrityError(battleId, 'winner_relation_mismatch');
            }

            if (battle.winnerParticipant.battleId !== battle.id) {
                this.throwCompletedIntegrityError(battleId, 'winner_relation_belongs_to_other_battle');
            }

            const loser = participants.find((participant) => participant.id !== battle.winnerParticipantId)!;
            if (winnerFlagged[0].voteCount <= loser.voteCount) {
                this.throwCompletedIntegrityError(battleId, 'winner_vote_count_not_greater_than_loser');
            }
        }

        if (battle.outcome === MarketplaceBattleOutcome.TIE) {
            if (battle.winnerParticipantId !== null) {
                this.throwCompletedIntegrityError(battleId, 'tie_outcome_with_non_null_winner_participant_id');
            }

            if (winnerFlagged.length > 0) {
                this.throwCompletedIntegrityError(battleId, 'tie_outcome_has_winner_flag');
            }

            if (participants[0].voteCount !== participants[1].voteCount) {
                this.throwCompletedIntegrityError(battleId, 'tie_outcome_with_unequal_vote_counts');
            }
        }

        return participants;
    }

    async getClosetMarketplaceBattleWinners(
        closetId: string,
        query: MarketplaceBattleWinnersQueryDto,
    ) {
        const closet = await this.prisma.mycloset.findUnique({
            where: { id: closetId },
            select: { id: true },
        });

        if (!closet) {
            throw new NotFoundException('Mycloset not found');
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const safeSortBy: MarketplaceBattleWinnersSortField =
            query.sortBy && Object.prototype.hasOwnProperty.call(MARKETPLACE_BATTLE_WINNERS_SORT_FIELD_MAP, query.sortBy)
                ? query.sortBy
                : 'completedAt';
        const safeSortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';

        const where: Prisma.MarketplaceBattleWhereInput = {
            closetId,
            status: MarketplaceBattleStatus.COMPLETED,
            outcome: MarketplaceBattleOutcome.WINNER,
            winnerParticipantId: { not: null },
            completedAt: { not: null },
        };

        const winnerByProductId = new Map<
            string,
            {
                product: {
                    id: string;
                    name: string;
                    images: string[];
                    price: number;
                    category: string;
                    brand: string | null;
                    condition: string;
                };
                winCount: number;
                latestWinAt: Date;
                latestBattleCreatedAt: Date;
                latestBattle: {
                    id: string;
                    title: string;
                    completedAt: Date;
                    totalVotes: number;
                    totalComments: number;
                };
                latestVoteCount: number;
                latestVotePercentage: number;
                totalVotesAcrossWins: number;
                totalCommentsAcrossWins: number;
            }
        >();

        let cursorId: string | null = null;

        while (true) {
            const battles: Prisma.MarketplaceBattleGetPayload<{
                select: typeof MARKETPLACE_BATTLE_WINNER_CAROUSEL_SELECT;
            }>[] = await this.prisma.marketplaceBattle.findMany({
                where,
                ...(cursorId
                    ? {
                        cursor: { id: cursorId },
                        skip: 1,
                    }
                    : {}),
                take: MARKETPLACE_BATTLE_WINNERS_FETCH_CHUNK_SIZE,
                orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
                select: MARKETPLACE_BATTLE_WINNER_CAROUSEL_SELECT,
            });

            if (battles.length === 0) break;
            cursorId = battles[battles.length - 1].id;

            for (const battle of battles) {
                let participants: CompletedBattleIntegrityInput['participants'];
                try {
                    participants = this.validateCompletedBattleIntegrity(battle as CompletedBattleIntegrityInput);
                } catch {
                    // Integrity issues are skipped for carousel continuity and logged with battle id.
                    continue;
                }

                const winnerParticipant = participants.find(
                    (participant) => participant.id === battle.winnerParticipantId,
                );

                if (!winnerParticipant) {
                    this.logger.warn(
                        `Marketplace battle winners carousel skipped malformed battle: battle=${battle.id}, reason=winner_not_found_in_participants`,
                    );
                    continue;
                }

                if (!winnerParticipant.product) {
                    this.logger.warn(
                        `Marketplace battle winners carousel skipped malformed battle: battle=${battle.id}, reason=winner_product_missing`,
                    );
                    continue;
                }

                const latestVotePercentage = battle.totalVotes > 0
                    ? this.roundPercentage((winnerParticipant.voteCount / battle.totalVotes) * 100)
                    : 0;

                const existing = winnerByProductId.get(winnerParticipant.product.id);

                if (!existing) {
                    winnerByProductId.set(winnerParticipant.product.id, {
                        product: {
                            id: winnerParticipant.product.id,
                            name: winnerParticipant.product.name,
                            images: winnerParticipant.product.images,
                            price: winnerParticipant.product.price,
                            category: winnerParticipant.product.category,
                            brand: winnerParticipant.product.brand,
                            condition: winnerParticipant.product.condition,
                        },
                        winCount: 1,
                        latestWinAt: battle.completedAt!,
                        latestBattleCreatedAt: battle.createdAt,
                        latestBattle: {
                            id: battle.id,
                            title: battle.title,
                            completedAt: battle.completedAt!,
                            totalVotes: battle.totalVotes,
                            totalComments: battle.totalComments,
                        },
                        latestVoteCount: winnerParticipant.voteCount,
                        latestVotePercentage,
                        totalVotesAcrossWins: battle.totalVotes,
                        totalCommentsAcrossWins: battle.totalComments,
                    });
                    continue;
                }

                existing.winCount += 1;
                existing.totalVotesAcrossWins += battle.totalVotes;
                existing.totalCommentsAcrossWins += battle.totalComments;

                const shouldReplaceLatest =
                    battle.completedAt!.getTime() > existing.latestWinAt.getTime() ||
                    (battle.completedAt!.getTime() === existing.latestWinAt.getTime() &&
                        battle.id.localeCompare(existing.latestBattle.id) > 0);

                if (shouldReplaceLatest) {
                    existing.product = {
                        id: winnerParticipant.product.id,
                        name: winnerParticipant.product.name,
                        images: winnerParticipant.product.images,
                        price: winnerParticipant.product.price,
                        category: winnerParticipant.product.category,
                        brand: winnerParticipant.product.brand,
                        condition: winnerParticipant.product.condition,
                    };
                    existing.latestWinAt = battle.completedAt!;
                    existing.latestBattleCreatedAt = battle.createdAt;
                    existing.latestBattle = {
                        id: battle.id,
                        title: battle.title,
                        completedAt: battle.completedAt!,
                        totalVotes: battle.totalVotes,
                        totalComments: battle.totalComments,
                    };
                    existing.latestVoteCount = winnerParticipant.voteCount;
                    existing.latestVotePercentage = latestVotePercentage;
                }
            }
        }

        const winners = Array.from(winnerByProductId.values());
        const sortKey = MARKETPLACE_BATTLE_WINNERS_SORT_FIELD_MAP[safeSortBy];
        const direction = safeSortOrder === 'asc' ? 1 : -1;

        winners.sort((a, b) => {
            const left = a[sortKey];
            const right = b[sortKey];

            let compare = 0;
            if (left instanceof Date && right instanceof Date) {
                compare = left.getTime() - right.getTime();
            } else {
                compare = Number(left) - Number(right);
            }

            if (compare !== 0) return compare * direction;

            const latestWinTieBreaker = a.latestWinAt.getTime() - b.latestWinAt.getTime();
            if (latestWinTieBreaker !== 0) return latestWinTieBreaker * direction;

            return a.product.id.localeCompare(b.product.id);
        });

        const total = winners.length;
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
        const skip = (page - 1) * limit;

        return {
            winners: winners.slice(skip, skip + limit).map((winner) => ({
                product: winner.product,
                winCount: winner.winCount,
                latestWinAt: winner.latestWinAt,
                latestBattle: winner.latestBattle,
                latestVoteCount: winner.latestVoteCount,
                latestVotePercentage: winner.latestVotePercentage,
                totalVotesAcrossWins: winner.totalVotesAcrossWins,
            })),
            total,
            page,
            limit,
            totalPages,
        };
    }

    private mapResultParticipants(
        participants: Array<{
            id: string;
            position: number;
            voteCount: number;
            isWinner: boolean;
            product: {
                id: string;
                name: string;
                images: string[];
                price: number;
                category: string;
                brand: string | null;
                condition: string;
            };
        }>,
        totalVotes: number,
    ) {
        const voteSummary = this.mapVoteParticipants(
            participants.map((participant) => ({
                id: participant.id,
                position: participant.position,
                voteCount: participant.voteCount,
            })),
            totalVotes,
        );

        const voteSummaryById = new Map(voteSummary.map((item) => [item.id, item]));

        return participants
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((participant) => {
                const vote = voteSummaryById.get(participant.id)!;
                return {
                    id: participant.id,
                    position: participant.position,
                    voteCount: participant.voteCount,
                    votePercentage: vote.votePercentage,
                    isWinner: participant.isWinner,
                    product: {
                        id: participant.product.id,
                        name: participant.product.name,
                        images: participant.product.images,
                        price: participant.product.price,
                        category: participant.product.category,
                        brand: participant.product.brand,
                        condition: participant.product.condition,
                    },
                };
            });
    }

    async getMarketplaceBattleResults(battleId: string) {
        const battle = await this.loadCompletedMarketplaceBattle(battleId);
        const participants = this.validateCompletedBattleIntegrity(battle);

        const mappedParticipants = this.mapResultParticipants(participants, battle.totalVotes);

        const durationSeconds = Math.max(
            0,
            Math.floor((battle.endAt!.getTime() - battle.startAt!.getTime()) / 1000),
        );

        let winner: {
            participantId: string;
            product: {
                id: string;
                name: string;
                images: string[];
                price: number;
                category: string;
                brand: string | null;
                condition: string;
            };
        } | null = null;
        let voteDifference = 0;

        if (battle.outcome === MarketplaceBattleOutcome.WINNER) {
            const winnerParticipant = mappedParticipants.find(
                (participant) => participant.id === battle.winnerParticipantId,
            )!;
            const loserParticipant = mappedParticipants.find(
                (participant) => participant.id !== battle.winnerParticipantId,
            )!;

            voteDifference = winnerParticipant.voteCount - loserParticipant.voteCount;
            winner = {
                participantId: winnerParticipant.id,
                product: winnerParticipant.product,
            };
        }

        return {
            id: battle.id,
            title: battle.title,
            description: battle.description,
            category: battle.category,
            status: battle.status,
            outcome: battle.outcome,
            startAt: battle.startAt,
            endAt: battle.endAt,
            publishedAt: battle.publishedAt,
            completedAt: battle.completedAt,
            durationSeconds,
            totalVotes: battle.totalVotes,
            totalComments: battle.totalComments,
            voteDifference,
            seller: {
                id: battle.seller.id,
                name: battle.seller.displayName || battle.seller.userName || 'Unknown Seller',
                profileImage: battle.seller.image,
            },
            closet: {
                id: battle.closet.id,
                shopName: battle.closet.shopName,
                shopUsername: battle.closet.shopUsername,
                shopLogo: battle.closet.shopLogo,
            },
            participants: mappedParticipants,
            winner,
        };
    }

    async getMarketplaceBattleInsights(userId: string, battleId: string) {
        const sellerId = this.assertSellerUserId(userId);

        const ownershipBattle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: {
                id: true,
                sellerId: true,
            },
        });

        if (!ownershipBattle) {
            throw new NotFoundException('Marketplace battle not found');
        }

        if (ownershipBattle.sellerId !== sellerId) {
            throw new ForbiddenException('Forbidden: you do not own this marketplace battle');
        }

        const battle = await this.loadCompletedMarketplaceBattle(battleId);
        const participants = this.validateCompletedBattleIntegrity(battle);

        const mappedParticipants = this.mapResultParticipants(participants, battle.totalVotes).map(
            (participant) => ({
                participantId: participant.id,
                position: participant.position,
                product: {
                    id: participant.product.id,
                    name: participant.product.name,
                    images: participant.product.images,
                },
                voteCount: participant.voteCount,
                votePercentage: participant.votePercentage,
                isWinner: participant.isWinner,
            }),
        );

        const durationSeconds = Math.max(
            0,
            Math.floor((battle.endAt!.getTime() - battle.startAt!.getTime()) / 1000),
        );

        const engagementCount = battle.totalVotes + battle.totalComments;

        let winner: {
            participantId: string;
            product: {
                id: string;
                name: string;
                images: string[];
            };
            voteCount: number;
            votePercentage: number;
        } | null = null;
        let loser: {
            participantId: string;
            product: {
                id: string;
                name: string;
                images: string[];
            };
            voteCount: number;
            votePercentage: number;
        } | null = null;
        let voteDifference = 0;
        let winningMarginPercentagePoints = 0;

        if (battle.outcome === MarketplaceBattleOutcome.WINNER) {
            const winnerParticipant = mappedParticipants.find(
                (participant) => participant.participantId === battle.winnerParticipantId,
            )!;
            const loserParticipant = mappedParticipants.find(
                (participant) => participant.participantId !== battle.winnerParticipantId,
            )!;

            voteDifference = winnerParticipant.voteCount - loserParticipant.voteCount;
            winningMarginPercentagePoints = this.roundPercentage(
                winnerParticipant.votePercentage - loserParticipant.votePercentage,
            );

            winner = {
                participantId: winnerParticipant.participantId,
                product: winnerParticipant.product,
                voteCount: winnerParticipant.voteCount,
                votePercentage: winnerParticipant.votePercentage,
            };
            loser = {
                participantId: loserParticipant.participantId,
                product: loserParticipant.product,
                voteCount: loserParticipant.voteCount,
                votePercentage: loserParticipant.votePercentage,
            };
        }

        return {
            battleId: battle.id,
            title: battle.title,
            status: battle.status,
            outcome: battle.outcome,
            startAt: battle.startAt,
            endAt: battle.endAt,
            completedAt: battle.completedAt,
            durationSeconds,
            totalVotes: battle.totalVotes,
            totalComments: battle.totalComments,
            engagementCount,
            participants: mappedParticipants,
            winner,
            loser,
            voteDifference,
            winningMarginPercentagePoints,
        };
    }

    private ensureOwnership(battle: { sellerId: string }, sellerId: string) {
        if (battle.sellerId !== sellerId) {
            throw new ForbiddenException('Forbidden: you do not own this marketplace battle');
        }
    }

    private ensureDraftStatus(status: MarketplaceBattleStatus, action: 'edited' | 'deleted') {
        if (status !== MarketplaceBattleStatus.DRAFT) {
            throw new BadRequestException(`Only draft marketplace battles can be ${action}`);
        }
    }

    private async validateMarketplaceBattleProducts(
        tx: PrismaTx,
        userId: string,
        closetId: string,
        productIds: string[],
    ) {
        if (!Array.isArray(productIds) || productIds.length !== 2) {
            throw new BadRequestException('Exactly two product IDs are required');
        }

        if (productIds[0] === productIds[1]) {
            throw new BadRequestException('Duplicate product IDs are not allowed');
        }

        const products = await tx.closetItems.findMany({
            where: {
                id: { in: productIds },
            },
            select: {
                id: true,
                userId: true,
                closetId: true,
                isActive: true,
                isDeleted: true,
                quantity: true,
            },
        });

        if (products.length !== 2) {
            const foundIds = new Set(products.map((product) => product.id));
            const missingProductIds = productIds.filter((id) => !foundIds.has(id));
            throw new BadRequestException({
                message: 'One or more products were not found',
                missingProductIds,
            });
        }

        const invalidOwnership = products.filter(
            (product) => product.userId !== userId || product.closetId !== closetId,
        );
        if (invalidOwnership.length > 0) {
            throw new BadRequestException({
                message: 'Products must belong to your closet',
                invalidProductIds: invalidOwnership.map((product) => product.id),
            });
        }

        const unavailableProducts = products.filter(
            (product) => !product.isActive || product.isDeleted || product.quantity <= 0,
        );
        if (unavailableProducts.length > 0) {
            throw new BadRequestException({
                message: 'Products are not eligible for marketplace battle',
                invalidProductIds: unavailableProducts.map((product) => product.id),
            });
        }
    }

    private async getSellerBattleDetailsOrThrow(sellerId: string, battleId: string) {
        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: {
                ...MARKETPLACE_BATTLE_BASE_SELECT,
                participants: {
                    orderBy: { position: 'asc' },
                    select: {
                        id: true,
                        battleId: true,
                        productId: true,
                        position: true,
                        voteCount: true,
                        isWinner: true,
                        createdAt: true,
                        updatedAt: true,
                        product: {
                            select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                        },
                    },
                },
                winnerParticipant: {
                    select: {
                        id: true,
                        battleId: true,
                        productId: true,
                        position: true,
                        voteCount: true,
                        isWinner: true,
                        product: {
                            select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                        },
                    },
                },
            },
        });

        if (!battle) throw new NotFoundException('Marketplace battle not found');
        this.ensureOwnership(battle, sellerId);
        return battle;
    }

    async createDraftBattle(userId: string, dto: CreateMarketplaceBattleDto) {
        const sellerId = this.assertSellerUserId(userId);
        const now = new Date();

        const endAt = new Date(dto.endAt);
        if (Number.isNaN(endAt.getTime())) {
            throw new BadRequestException('Invalid endAt');
        }

        const explicitStartAt = dto.startAt ? new Date(dto.startAt) : undefined;
        if (explicitStartAt && Number.isNaN(explicitStartAt.getTime())) {
            throw new BadRequestException('Invalid startAt');
        }

        if (explicitStartAt && explicitStartAt.getTime() < now.getTime() - PAST_START_TOLERANCE_MS) {
            throw new BadRequestException('startAt is too far in the past');
        }

        const effectiveStartAt = explicitStartAt ?? now;

        if (endAt.getTime() <= effectiveStartAt.getTime()) {
            throw new BadRequestException('endAt must be greater than startAt');
        }

        const targetStatus =
            effectiveStartAt.getTime() <= now.getTime()
                ? MarketplaceBattleStatus.LIVE
                : MarketplaceBattleStatus.SCHEDULED;

        const closet = await this.prisma.mycloset.findUnique({
            where: { userId: sellerId },
            select: { id: true },
        });

        if (!closet) {
            throw new NotFoundException('Mycloset not found');
        }

        const productIds = dto.productIds;
        await this.validateMarketplaceBattleProducts(this.prisma, sellerId, closet.id, productIds);

        return this.prisma.$transaction(async (tx) => {
            const battle = await tx.marketplaceBattle.create({
                data: {
                    sellerId,
                    closetId: closet.id,
                    title: dto.title,
                    description: dto.description,
                    category: dto.category,
                    visibility: dto.visibility ?? WhoCanBuy.Everyone,
                    whoCanVote: dto.whoCanVote ?? WhoCanBuy.Everyone,
                    shareToFeed: dto.shareToFeed ?? false,
                    status: targetStatus,
                    outcome: MarketplaceBattleOutcome.PENDING,
                    startAt: effectiveStartAt,
                    endAt,
                    publishedAt: now,
                    totalVotes: 0,
                    totalComments: 0,
                },
                select: {
                    id: true,
                    sellerId: true,
                    closetId: true,
                    title: true,
                    description: true,
                    category: true,
                    status: true,
                    outcome: true,
                    startAt: true,
                    endAt: true,
                    publishedAt: true,
                    completedAt: true,
                    totalVotes: true,
                    totalComments: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            await tx.marketplaceBattleParticipant.createMany({
                data: [
                    {
                        battleId: battle.id,
                        productId: productIds[0],
                        position: 1,
                        voteCount: 0,
                        isWinner: false,
                    },
                    {
                        battleId: battle.id,
                        productId: productIds[1],
                        position: 2,
                        voteCount: 0,
                        isWinner: false,
                    },
                ],
            });

            const createdBattle = await tx.marketplaceBattle.findUnique({
                where: { id: battle.id },
                select: {
                    id: true,
                    sellerId: true,
                    closetId: true,
                    title: true,
                    description: true,
                    category: true,
                    status: true,
                    outcome: true,
                    startAt: true,
                    endAt: true,
                    publishedAt: true,
                    completedAt: true,
                    totalVotes: true,
                    totalComments: true,
                    createdAt: true,
                    updatedAt: true,
                    participants: {
                        orderBy: { position: 'asc' },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            createdAt: true,
                            updatedAt: true,
                            product: {
                                select: {
                                    id: true,
                                    closetId: true,
                                    userId: true,
                                    images: true,
                                    name: true,
                                    category: true,
                                    brand: true,
                                    condition: true,
                                    description: true,
                                    price: true,
                                    quantity: true,
                                    isActive: true,
                                    isDeleted: true,
                                    shippingOption: true,
                                    shippingFee: true,
                                    estimateShippingTime: true,
                                    pickupAddress: true,
                                    pickupAvailableHours: true,
                                    buyerChatEnabled: true,
                                    returnPolicy: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!createdBattle) {
                throw new NotFoundException('Marketplace battle not found after creation');
            }

            if (targetStatus === MarketplaceBattleStatus.LIVE) {
                await this.createMarketplaceBattleNotification(tx, {
                    userId: sellerId,
                    type: 'marketplace_battle_live',
                    title: 'Marketplace Battle Is Live',
                    body: `Your marketplace battle "${createdBattle.title || createdBattle.id}" is now live.`,
                    dedupeKey: `marketplace_battle_live:${createdBattle.id}`,
                    metadata: {
                        battleId: createdBattle.id,
                        status: createdBattle.status,
                        startAt: createdBattle.startAt?.toISOString(),
                        endAt: createdBattle.endAt?.toISOString(),
                    },
                });
            }

            return createdBattle;
        });
    }

    async listMyBattles(userId: string, query: MarketplaceBattleListQueryDto) {
        const sellerId = this.assertSellerUserId(userId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const sortBy = query.sortBy;
        const sortOrder = query.sortOrder;

        const where: Prisma.MarketplaceBattleWhereInput = {
            sellerId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.category
                ? {
                    category: {
                        equals: query.category,
                        mode: 'insensitive',
                    },
                }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        {
                            title: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            description: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }
                : {}),
        };

        const [total, battles] = await this.prisma.$transaction([
            this.prisma.marketplaceBattle.count({ where }),
            this.prisma.marketplaceBattle.findMany({
                where,
                skip,
                take: limit,
                orderBy: this.getSortOrder(sortBy, sortOrder),
                select: {
                    ...MARKETPLACE_BATTLE_BASE_SELECT,
                    participants: {
                        orderBy: { position: 'asc' },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            product: {
                                select: MARKETPLACE_BATTLE_LIST_PRODUCT_SELECT,
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            battles,
            total,
            page,
            limit,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        };
    }

    async getMyBattleById(userId: string, battleId: string) {
        const viewerUserId = this.assertSellerUserId(userId);

        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: {
                id: true,
                sellerId: true,
            },
        });

        if (!battle) {
            throw new NotFoundException('Marketplace battle not found');
        }

        const viewCount = await this.prisma.marketplaceBattleView.count({
            where: { battleId },
        });

        if (battle.sellerId === viewerUserId) {
            const sellerBattle = await this.getSellerBattleDetailsOrThrow(viewerUserId, battleId);
            return {
                ...sellerBattle,
                viewCount,
                voteCount: sellerBattle.totalVotes,
                commentCount: sellerBattle.totalComments,
            };
        }

        const publicBattle = await this.getPublicBattleById(battleId, viewerUserId);
        return {
            ...publicBattle,
            viewCount,
            voteCount: publicBattle.totalVotes,
            commentCount: publicBattle.totalComments,
        };
    }

    async trackMarketplaceBattleView(userId: string, battleId: string) {
        const viewerId = this.assertSellerUserId(userId);
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            const battle = await tx.marketplaceBattle.findUnique({
                where: { id: battleId },
                select: {
                    id: true,
                    sellerId: true,
                    visibility: true,
                    status: true,
                    startAt: true,
                    endAt: true,
                    participants: {
                        select: {
                            product: {
                                select: {
                                    isActive: true,
                                    isDeleted: true,
                                    quantity: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!battle) {
                throw new NotFoundException('Marketplace battle not found');
            }

            if (
                battle.status !== MarketplaceBattleStatus.LIVE &&
                battle.status !== MarketplaceBattleStatus.SCHEDULED &&
                battle.status !== MarketplaceBattleStatus.COMPLETED
            ) {
                throw new NotFoundException('Marketplace battle not found');
            }

            if (!this.shouldExposeByStatusAndTime(battle, now)) {
                throw new NotFoundException('Marketplace battle not found');
            }

            if (!this.hasPubliclyEligibleProductsForActiveOrScheduled(battle)) {
                throw new NotFoundException('Marketplace battle not found');
            }

            await this.assertBattleVisibleToViewer(tx, battle.visibility, battle.sellerId, viewerId);

            if (battle.sellerId === viewerId) {
                const viewCount = await tx.marketplaceBattleView.count({
                    where: { battleId },
                });

                return {
                    tracked: false,
                    reason: 'SELF_VIEW_IGNORED',
                    battleId,
                    viewCount,
                };
            }

            const existingView = await tx.marketplaceBattleView.findUnique({
                where: {
                    battleId_viewerId: {
                        battleId,
                        viewerId,
                    },
                },
                select: { id: true },
            });

            if (!existingView) {
                await tx.marketplaceBattleView.create({
                    data: {
                        battleId,
                        viewerId,
                    },
                });
            }

            const viewCount = await tx.marketplaceBattleView.count({
                where: { battleId },
            });

            return {
                tracked: !existingView,
                reason: existingView ? 'ALREADY_VIEWED' : 'VIEW_TRACKED',
                battleId,
                viewCount,
            };
        });
    }

    async updateDraftBattle(userId: string, battleId: string, dto: UpdateMarketplaceBattleDto) {
        const sellerId = this.assertSellerUserId(userId);

        if (
            dto.title === undefined &&
            dto.description === undefined &&
            dto.category === undefined &&
            dto.productIds === undefined
        ) {
            throw new BadRequestException('No data provided for update');
        }

        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: {
                id: true,
                sellerId: true,
                closetId: true,
                status: true,
                participants: {
                    orderBy: { position: 'asc' },
                    select: { productId: true },
                },
            },
        });

        if (!battle) throw new NotFoundException('Marketplace battle not found');
        this.ensureOwnership(battle, sellerId);
        this.ensureDraftStatus(battle.status, 'edited');

        const productIds = dto.productIds;
        const currentProductIds = battle.participants
            .sort((a, b) => a.productId.localeCompare(b.productId))
            .map((participant) => participant.productId);
        const nextProductIds = (productIds || [])
            .slice()
            .sort((a, b) => a.localeCompare(b));
        const shouldReplaceParticipants =
            Array.isArray(productIds) &&
            (currentProductIds.length !== 2 || nextProductIds.join('|') !== currentProductIds.join('|'));

        if (Array.isArray(productIds)) {
            await this.validateMarketplaceBattleProducts(
                this.prisma,
                sellerId,
                battle.closetId,
                productIds,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const updateResult = await tx.marketplaceBattle.updateMany({
                where: {
                    id: battleId,
                    sellerId,
                    status: MarketplaceBattleStatus.DRAFT,
                },
                data: {
                    ...(dto.title !== undefined ? { title: dto.title } : {}),
                    ...(dto.description !== undefined ? { description: dto.description } : {}),
                    ...(dto.category !== undefined ? { category: dto.category } : {}),
                },
            });

            if (updateResult.count === 0) {
                const latest = await tx.marketplaceBattle.findUnique({
                    where: { id: battleId },
                    select: { id: true, sellerId: true, status: true },
                });

                if (!latest) throw new NotFoundException('Marketplace battle not found');
                this.ensureOwnership(latest, sellerId);
                this.ensureDraftStatus(latest.status, 'edited');
            }

            if (shouldReplaceParticipants && productIds) {
                await this.validateMarketplaceBattleProducts(tx, sellerId, battle.closetId, productIds);

                await tx.marketplaceBattleParticipant.deleteMany({
                    where: { battleId },
                });

                await tx.marketplaceBattleParticipant.createMany({
                    data: [
                        {
                            battleId,
                            productId: productIds[0],
                            position: 1,
                            voteCount: 0,
                            isWinner: false,
                        },
                        {
                            battleId,
                            productId: productIds[1],
                            position: 2,
                            voteCount: 0,
                            isWinner: false,
                        },
                    ],
                });
            }

            const updatedBattle = await tx.marketplaceBattle.findUnique({
                where: { id: battleId },
                select: {
                    ...MARKETPLACE_BATTLE_BASE_SELECT,
                    participants: {
                        orderBy: { position: 'asc' },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            createdAt: true,
                            updatedAt: true,
                            product: {
                                select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                            },
                        },
                    },
                    winnerParticipant: {
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            product: {
                                select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                            },
                        },
                    },
                },
            });

            if (!updatedBattle) throw new NotFoundException('Marketplace battle not found');
            return updatedBattle;
        });
    }

    async deleteDraftBattle(userId: string, battleId: string) {
        const sellerId = this.assertSellerUserId(userId);

        const battle = await this.getBattleByIdOrThrow(battleId);
        this.ensureOwnership(battle, sellerId);
        this.ensureDraftStatus(battle.status, 'deleted');

        const deleteResult = await this.prisma.marketplaceBattle.deleteMany({
            where: {
                id: battleId,
                sellerId,
                status: MarketplaceBattleStatus.DRAFT,
            },
        });

        if (deleteResult.count === 0) {
            const latest = await this.getBattleByIdOrThrow(battleId);
            this.ensureOwnership(latest, sellerId);
            this.ensureDraftStatus(latest.status, 'deleted');
        }

        return {
            message: 'Marketplace battle deleted successfully',
            battleId,
        };
    }

    async voteMarketplaceBattle(userId: string, battleId: string, dto: VoteMarketplaceBattleDto) {
        const voterUserId = this.assertSellerUserId(userId);
        const now = new Date();

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await tx.$queryRaw`
                        SELECT id
                        FROM "MarketplaceBattle"
                        WHERE id = ${battleId}
                        FOR UPDATE
                    `;

                    const battle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            id: true,
                            sellerId: true,
                            whoCanVote: true,
                            status: true,
                            startAt: true,
                            endAt: true,
                        },
                    });

                    if (!battle) throw new NotFoundException('Marketplace battle not found');
                    this.ensureVotingWindowOpen(battle, now);

                    if (battle.sellerId === voterUserId) {
                        throw new ForbiddenException('Sellers cannot vote in their own marketplace battle');
                    }

                    if (battle.whoCanVote === WhoCanBuy.followers) {
                        const isFollower = await this.isAcceptedFollower(tx, voterUserId, battle.sellerId);
                        if (!isFollower) {
                            throw new ForbiddenException('Only followers can vote in this marketplace battle');
                        }
                    }

                    const participant = await tx.marketplaceBattleParticipant.findFirst({
                        where: {
                            id: dto.participantId,
                            battleId,
                        },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            product: {
                                select: {
                                    isActive: true,
                                    isDeleted: true,
                                    quantity: true,
                                },
                            },
                        },
                    });

                    if (!participant) {
                        throw new BadRequestException('Invalid participant for this marketplace battle');
                    }

                    if (
                        !participant.product ||
                        !participant.product.isActive ||
                        participant.product.isDeleted ||
                        participant.product.quantity <= 0
                    ) {
                        throw new BadRequestException('Selected participant product is not eligible for voting');
                    }

                    const existingVote = await tx.marketplaceBattleVote.findUnique({
                        where: {
                            battleId_userId: {
                                battleId,
                                userId: voterUserId,
                            },
                        },
                        select: { id: true },
                    });

                    if (existingVote) {
                        throw new ConflictException('You have already voted in this marketplace battle.');
                    }

                    try {
                        await tx.marketplaceBattleVote.create({
                            data: {
                                battleId,
                                participantId: participant.id,
                                userId: voterUserId,
                            },
                        });
                    } catch (error) {
                        if (this.isUniqueConstraintViolation(error)) {
                            throw new ConflictException('You have already voted in this marketplace battle.');
                        }
                        throw error;
                    }

                    const participantUpdate = await tx.marketplaceBattleParticipant.updateMany({
                        where: {
                            id: participant.id,
                            battleId,
                        },
                        data: {
                            voteCount: { increment: 1 },
                        },
                    });

                    if (participantUpdate.count !== 1) {
                        throw new InternalServerErrorException('Failed to update participant vote counter');
                    }

                    const battleUpdate = await tx.marketplaceBattle.updateMany({
                        where: {
                            id: battleId,
                            status: MarketplaceBattleStatus.LIVE,
                            startAt: { lte: now },
                            endAt: { gt: now },
                        },
                        data: {
                            totalVotes: { increment: 1 },
                        },
                    });

                    if (battleUpdate.count !== 1) {
                        throw new BadRequestException('Marketplace battle voting has ended');
                    }

                    const updatedBattle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            totalVotes: true,
                            participants: {
                                orderBy: { position: 'asc' },
                                select: {
                                    id: true,
                                    position: true,
                                    voteCount: true,
                                },
                            },
                        },
                    });

                    if (!updatedBattle) {
                        throw new NotFoundException('Marketplace battle not found');
                    }

                    return {
                        message: 'Vote submitted successfully',
                        battleId,
                        vote: {
                            participantId: participant.id,
                            productId: participant.productId,
                        },
                        totalVotes: updatedBattle.totalVotes,
                        participants: this.mapVoteParticipants(updatedBattle.participants, updatedBattle.totalVotes),
                    };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error: any) {
            if (
                typeof error?.message === 'string' &&
                error.message.toLowerCase().includes('could not serialize access')
            ) {
                throw new BadRequestException('Please retry your vote');
            }
            throw error;
        }
    }

    async removeMarketplaceBattleVote(userId: string, battleId: string) {
        const voterUserId = this.assertSellerUserId(userId);
        const now = new Date();

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await tx.$queryRaw`
                        SELECT id
                        FROM "MarketplaceBattle"
                        WHERE id = ${battleId}
                        FOR UPDATE
                    `;

                    const battle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            id: true,
                            status: true,
                            startAt: true,
                            endAt: true,
                        },
                    });

                    if (!battle) throw new NotFoundException('Marketplace battle not found');
                    this.ensureVotingWindowOpen(battle, now);

                    const vote = await tx.marketplaceBattleVote.findUnique({
                        where: {
                            battleId_userId: {
                                battleId,
                                userId: voterUserId,
                            },
                        },
                        select: {
                            id: true,
                            participantId: true,
                        },
                    });

                    if (!vote) {
                        throw new NotFoundException('No existing vote found for this marketplace battle');
                    }

                    const deleteResult = await tx.marketplaceBattleVote.deleteMany({
                        where: {
                            id: vote.id,
                            battleId,
                            userId: voterUserId,
                        },
                    });

                    if (deleteResult.count !== 1) {
                        throw new NotFoundException('No existing vote found for this marketplace battle');
                    }

                    const participantUpdate = await tx.marketplaceBattleParticipant.updateMany({
                        where: {
                            id: vote.participantId,
                            battleId,
                            voteCount: { gt: 0 },
                        },
                        data: {
                            voteCount: { decrement: 1 },
                        },
                    });

                    if (participantUpdate.count !== 1) {
                        this.logger.error(
                            `Counter integrity violation while removing vote: participant underflow prevented for battle=${battleId}`,
                        );
                        throw new InternalServerErrorException('Vote counter integrity check failed');
                    }

                    const battleUpdate = await tx.marketplaceBattle.updateMany({
                        where: {
                            id: battleId,
                            status: MarketplaceBattleStatus.LIVE,
                            startAt: { lte: now },
                            endAt: { gt: now },
                            totalVotes: { gt: 0 },
                        },
                        data: {
                            totalVotes: { decrement: 1 },
                        },
                    });

                    if (battleUpdate.count !== 1) {
                        this.logger.error(
                            `Counter integrity violation while removing vote: totalVotes underflow prevented for battle=${battleId}`,
                        );
                        throw new InternalServerErrorException('Battle vote counter integrity check failed');
                    }

                    const updatedBattle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            totalVotes: true,
                            participants: {
                                orderBy: { position: 'asc' },
                                select: {
                                    id: true,
                                    position: true,
                                    voteCount: true,
                                },
                            },
                        },
                    });

                    if (!updatedBattle) {
                        throw new NotFoundException('Marketplace battle not found');
                    }

                    return {
                        message: 'Vote removed successfully',
                        battleId,
                        removedVote: {
                            participantId: vote.participantId,
                        },
                        totalVotes: updatedBattle.totalVotes,
                        participants: this.mapVoteParticipants(updatedBattle.participants, updatedBattle.totalVotes),
                    };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error: any) {
            if (
                typeof error?.message === 'string' &&
                error.message.toLowerCase().includes('could not serialize access')
            ) {
                throw new BadRequestException('Please retry removing your vote');
            }
            throw error;
        }
    }

    async createMarketplaceBattleComment(userId: string, battleId: string, dto: CreateMarketplaceBattleCommentDto) {
        const commenterId = this.assertSellerUserId(userId);
        const now = new Date();

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await tx.$queryRaw`
                        SELECT id
                        FROM "MarketplaceBattle"
                        WHERE id = ${battleId}
                        FOR UPDATE
                    `;

                    const battle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            id: true,
                            status: true,
                            startAt: true,
                            endAt: true,
                        },
                    });

                    if (!battle) throw new NotFoundException('Marketplace battle not found');
                    this.ensureCommentingWindowOpen(battle, now);

                    const createdComment = await tx.marketplaceBattleComment.create({
                        data: {
                            battleId,
                            userId: commenterId,
                            comment: dto.comment,
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            comment: true,
                            createdAt: true,
                            updatedAt: true,
                            user: {
                                select: MARKETPLACE_BATTLE_COMMENT_AUTHOR_SELECT,
                            },
                        },
                    });

                    const battleUpdate = await tx.marketplaceBattle.updateMany({
                        where: {
                            id: battleId,
                            status: MarketplaceBattleStatus.LIVE,
                            startAt: { lte: now },
                            endAt: { gt: now },
                        },
                        data: {
                            totalComments: { increment: 1 },
                        },
                    });

                    if (battleUpdate.count !== 1) {
                        throw new BadRequestException('Marketplace battle commenting has ended');
                    }

                    const updatedBattle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: { totalComments: true },
                    });

                    if (!updatedBattle) throw new NotFoundException('Marketplace battle not found');

                    return {
                        message: 'Comment added successfully',
                        totalComments: updatedBattle.totalComments,
                        comment: {
                            id: createdComment.id,
                            comment: createdComment.comment,
                            createdAt: createdComment.createdAt,
                            updatedAt: createdComment.updatedAt,
                            user: this.mapPublicCommentUser(createdComment.user),
                        },
                    };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error: any) {
            if (
                typeof error?.message === 'string' &&
                error.message.toLowerCase().includes('could not serialize access')
            ) {
                throw new BadRequestException('Please retry adding your comment');
            }
            throw error;
        }
    }

    async listMarketplaceBattleComments(battleId: string, query: MarketplaceBattleCommentsQueryDto) {
        const now = new Date();

        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: {
                id: true,
                status: true,
                startAt: true,
                endAt: true,
            },
        });

        if (!battle) throw new NotFoundException('Marketplace battle not found');

        if (battle.status === MarketplaceBattleStatus.LIVE) {
            if (!battle.startAt || !battle.endAt || battle.startAt > now || battle.endAt <= now) {
                throw new NotFoundException('Marketplace battle not found');
            }
        } else if (battle.status !== MarketplaceBattleStatus.COMPLETED) {
            throw new NotFoundException('Marketplace battle not found');
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';
        const skip = (page - 1) * limit;

        const where: Prisma.MarketplaceBattleCommentWhereInput = {
            battleId,
            deletedAt: null,
        };

        const [total, comments] = await this.prisma.$transaction([
            this.prisma.marketplaceBattleComment.count({ where }),
            this.prisma.marketplaceBattleComment.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ createdAt: sortOrder }, { id: sortOrder }],
                select: {
                    id: true,
                    comment: true,
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        select: MARKETPLACE_BATTLE_COMMENT_AUTHOR_SELECT,
                    },
                },
            }),
        ]);

        return {
            comments: comments.map((comment) => ({
                id: comment.id,
                comment: comment.comment,
                createdAt: comment.createdAt,
                updatedAt: comment.updatedAt,
                user: this.mapPublicCommentUser(comment.user),
            })),
            total,
            page,
            limit,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        };
    }

    async deleteMarketplaceBattleComment(userId: string, battleId: string, commentId: string) {
        const requesterId = this.assertSellerUserId(userId);
        const now = new Date();

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await tx.$queryRaw`
                        SELECT id
                        FROM "MarketplaceBattle"
                        WHERE id = ${battleId}
                        FOR UPDATE
                    `;

                    const battle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            id: true,
                            status: true,
                        },
                    });

                    if (!battle) throw new NotFoundException('Marketplace battle not found');

                    if (
                        battle.status !== MarketplaceBattleStatus.LIVE &&
                        battle.status !== MarketplaceBattleStatus.COMPLETED
                    ) {
                        throw new BadRequestException('Comments cannot be deleted for this marketplace battle status');
                    }

                    const existingComment = await tx.marketplaceBattleComment.findFirst({
                        where: {
                            id: commentId,
                            battleId,
                        },
                        select: {
                            id: true,
                            userId: true,
                            deletedAt: true,
                        },
                    });

                    if (!existingComment) {
                        throw new NotFoundException('Marketplace battle comment not found');
                    }

                    if (existingComment.userId !== requesterId) {
                        throw new ForbiddenException('You can only delete your own marketplace battle comments');
                    }

                    if (existingComment.deletedAt) {
                        throw new ConflictException('Marketplace battle comment is already deleted');
                    }

                    const softDelete = await tx.marketplaceBattleComment.updateMany({
                        where: {
                            id: commentId,
                            battleId,
                            userId: requesterId,
                            deletedAt: null,
                        },
                        data: {
                            deletedAt: now,
                        },
                    });

                    if (softDelete.count !== 1) {
                        throw new ConflictException('Marketplace battle comment is already deleted');
                    }

                    const battleCounterUpdate = await tx.marketplaceBattle.updateMany({
                        where: {
                            id: battleId,
                            totalComments: { gt: 0 },
                        },
                        data: {
                            totalComments: { decrement: 1 },
                        },
                    });

                    if (battleCounterUpdate.count !== 1) {
                        this.logger.error(
                            `Counter integrity violation while deleting comment: totalComments underflow prevented for battle=${battleId}`,
                        );
                        throw new InternalServerErrorException('Battle comment counter integrity check failed');
                    }

                    const updatedBattle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            totalComments: true,
                        },
                    });

                    if (!updatedBattle) throw new NotFoundException('Marketplace battle not found');

                    return {
                        message: 'Comment deleted successfully',
                        commentId,
                        totalComments: updatedBattle.totalComments,
                    };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error: any) {
            if (
                typeof error?.message === 'string' &&
                error.message.toLowerCase().includes('could not serialize access')
            ) {
                throw new BadRequestException('Please retry deleting your comment');
            }
            throw error;
        }
    }

    async explorePublicBattles(query: MarketplaceBattleExploreQueryDto, viewerUserId?: string) {
        const now = new Date();

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: Prisma.MarketplaceBattleWhereInput = {
            status: MarketplaceBattleStatus.LIVE,
            startAt: { lte: now },
            endAt: { gt: now },
            AND: [this.getVisibilityWhere(viewerUserId)],
            ...(query.category
                ? {
                    category: {
                        equals: query.category,
                        mode: 'insensitive',
                    },
                }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { title: { contains: query.search, mode: 'insensitive' } },
                        { description: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            participants: {
                every: {
                    product: {
                        isActive: true,
                        isDeleted: false,
                        quantity: { gt: 0 },
                    },
                },
                some: {
                    product: {
                        isActive: true,
                        isDeleted: false,
                        quantity: { gt: 0 },
                    },
                },
            },
        };

        const [total, battles] = await this.prisma.$transaction([
            this.prisma.marketplaceBattle.count({ where }),
            this.prisma.marketplaceBattle.findMany({
                where,
                skip,
                take: limit,
                orderBy: this.getExploreSortOrder(query.sortBy, query.sortOrder),
                select: MARKETPLACE_BATTLE_PUBLIC_SELECT,
            }),
        ]);

        const mappedBattles = battles
            .filter((battle) => this.shouldExposeByStatusAndTime(battle, now))
            .filter((battle) => this.hasPubliclyEligibleProductsForActiveOrScheduled(battle))
            .map((battle) => this.mapPublicBattleResponse(battle, now));

        return {
            battles: mappedBattles,
            total,
            page,
            limit,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        };
    }

    async getClosetPublicBattles(
        closetId: string,
        query: ClosetMarketplaceBattlesQueryDto,
        viewerUserId?: string,
    ) {
        const now = new Date();

        const closet = await this.prisma.mycloset.findUnique({
            where: { id: closetId },
            select: { id: true },
        });

        if (!closet) throw new NotFoundException('Mycloset not found');

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const statusFilter = query.status as ClosetMarketplaceBattlePublicStatus | undefined;

        const getStatusWhere = (status: ClosetMarketplaceBattlePublicStatus): Prisma.MarketplaceBattleWhereInput => {
            if (status === 'LIVE') {
                return {
                    status: MarketplaceBattleStatus.LIVE,
                    startAt: { lte: now },
                    endAt: { gt: now },
                    participants: {
                        every: {
                            product: {
                                isActive: true,
                                isDeleted: false,
                                quantity: { gt: 0 },
                            },
                        },
                        some: {
                            product: {
                                isActive: true,
                                isDeleted: false,
                                quantity: { gt: 0 },
                            },
                        },
                    },
                };
            }

            if (status === 'SCHEDULED') {
                return {
                    status: MarketplaceBattleStatus.SCHEDULED,
                    startAt: { gt: now },
                    endAt: { gt: now },
                    participants: {
                        every: {
                            product: {
                                isActive: true,
                                isDeleted: false,
                                quantity: { gt: 0 },
                            },
                        },
                        some: {
                            product: {
                                isActive: true,
                                isDeleted: false,
                                quantity: { gt: 0 },
                            },
                        },
                    },
                };
            }

            return {
                status: MarketplaceBattleStatus.COMPLETED,
            };
        };

        const where: Prisma.MarketplaceBattleWhereInput = {
            closetId,
            AND: [this.getVisibilityWhere(viewerUserId)],
            ...(statusFilter
                ? getStatusWhere(statusFilter)
                : {
                    OR: [
                        getStatusWhere('LIVE'),
                        getStatusWhere('SCHEDULED'),
                        getStatusWhere('COMPLETED'),
                    ],
                }),
        };

        const [total, battles] = await this.prisma.$transaction([
            this.prisma.marketplaceBattle.count({ where }),
            this.prisma.marketplaceBattle.findMany({
                where,
                skip,
                take: limit,
                orderBy: this.getClosetSortOrder(query.sortBy, query.sortOrder),
                select: MARKETPLACE_BATTLE_PUBLIC_SELECT,
            }),
        ]);

        const mappedBattles = battles
            .filter((battle) => this.shouldExposeByStatusAndTime(battle, now))
            .filter((battle) => this.hasPubliclyEligibleProductsForActiveOrScheduled(battle))
            .map((battle) => this.mapPublicBattleResponse(battle, now));

        return {
            battles: mappedBattles,
            total,
            page,
            limit,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        };
    }

    async getPublicBattleById(battleId: string, viewerUserId?: string) {
        const now = new Date();

        const battle = await this.prisma.marketplaceBattle.findUnique({
            where: { id: battleId },
            select: MARKETPLACE_BATTLE_PUBLIC_SELECT,
        });

        if (!battle) throw new NotFoundException('Marketplace battle not found');

        if (
            battle.status !== MarketplaceBattleStatus.LIVE &&
            battle.status !== MarketplaceBattleStatus.SCHEDULED &&
            battle.status !== MarketplaceBattleStatus.COMPLETED
        ) {
            throw new NotFoundException('Marketplace battle not found');
        }

        if (!this.shouldExposeByStatusAndTime(battle, now)) {
            throw new NotFoundException('Marketplace battle not found');
        }

        if (!this.hasPubliclyEligibleProductsForActiveOrScheduled(battle)) {
            throw new NotFoundException('Marketplace battle not found');
        }

        await this.assertBattleVisibleToViewer(
            this.prisma,
            battle.visibility,
            battle.sellerId,
            viewerUserId,
        );

        return this.mapPublicBattleResponse(battle, now);
    }

    async cancelMarketplaceBattle(userId: string, battleId: string) {
        const sellerId = this.assertSellerUserId(userId);

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    await tx.$queryRaw`
                        SELECT id
                        FROM "MarketplaceBattle"
                        WHERE id = ${battleId}
                        FOR UPDATE
                    `;

                    const battle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            id: true,
                            sellerId: true,
                            status: true,
                            startAt: true,
                            endAt: true,
                            publishedAt: true,
                            completedAt: true,
                        },
                    });

                    if (!battle) {
                        throw new NotFoundException('Marketplace battle not found');
                    }

                    this.ensureOwnership(battle, sellerId);

                    if (battle.status === MarketplaceBattleStatus.DRAFT) {
                        throw new BadRequestException(
                            'Draft marketplace battles must be deleted using the draft delete endpoint.',
                        );
                    }

                    if (battle.status === MarketplaceBattleStatus.COMPLETED) {
                        throw new BadRequestException('Completed marketplace battles cannot be cancelled');
                    }

                    if (battle.status === MarketplaceBattleStatus.CANCELLED) {
                        throw new ConflictException('Marketplace battle is already cancelled');
                    }

                    if (
                        battle.status !== MarketplaceBattleStatus.SCHEDULED &&
                        battle.status !== MarketplaceBattleStatus.LIVE
                    ) {
                        throw new BadRequestException('Only scheduled or live marketplace battles can be cancelled');
                    }

                    const participants = await tx.marketplaceBattleParticipant.findMany({
                        where: { battleId },
                        orderBy: { position: 'asc' },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            product: {
                                select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                            },
                        },
                    });

                    if (participants.length !== 2) {
                        this.logger.error(
                            `Marketplace battle completed-data integrity failure: battle=${battleId}, reason=participant_count_not_two`,
                        );
                        throw new InternalServerErrorException('Marketplace battle result integrity check failed');
                    }

                    const positions = participants
                        .map((participant) => participant.position)
                        .sort((a, b) => a - b);
                    if (positions[0] !== 1 || positions[1] !== 2) {
                        this.logger.error(
                            `Marketplace battle completed-data integrity failure: battle=${battleId}, reason=invalid_participant_positions`,
                        );
                        throw new InternalServerErrorException('Marketplace battle result integrity check failed');
                    }

                    const uniqueProductCount = new Set(
                        participants.map((participant) => participant.productId),
                    ).size;
                    if (uniqueProductCount !== 2) {
                        this.logger.error(
                            `Marketplace battle completed-data integrity failure: battle=${battleId}, reason=duplicate_participant_products`,
                        );
                        throw new InternalServerErrorException('Marketplace battle result integrity check failed');
                    }

                    const participantIds = participants.map((participant) => participant.id);

                    const totalVotesByBattle = await tx.marketplaceBattleVote.count({
                        where: { battleId },
                    });

                    const groupedVotes = await tx.marketplaceBattleVote.groupBy({
                        by: ['participantId'],
                        where: {
                            battleId,
                            participantId: {
                                in: participantIds,
                            },
                        },
                        _count: {
                            _all: true,
                        },
                    });

                    const voteCountByParticipant = new Map<string, number>();
                    for (const groupedVote of groupedVotes) {
                        voteCountByParticipant.set(groupedVote.participantId, groupedVote._count._all);
                    }

                    const authoritativeTotalVotes = groupedVotes.reduce(
                        (sum, groupedVote) => sum + groupedVote._count._all,
                        0,
                    );

                    const invalidVoteCount = totalVotesByBattle - authoritativeTotalVotes;
                    if (invalidVoteCount > 0) {
                        this.logger.warn(
                            `Battle ${battleId} has ${invalidVoteCount} invalid vote rows with mismatched participant linkage; ignored in final tally`,
                        );
                    }

                    for (const participant of participants) {
                        const authoritativeVoteCount =
                            voteCountByParticipant.get(participant.id) || 0;
                        const participantUpdate = await tx.marketplaceBattleParticipant.updateMany({
                            where: {
                                id: participant.id,
                                battleId,
                            },
                            data: {
                                voteCount: authoritativeVoteCount,
                                isWinner: false,
                            },
                        });

                        if (participantUpdate.count !== 1) {
                            throw new InternalServerErrorException(
                                'Failed to reconcile marketplace battle participant counters',
                            );
                        }
                    }

                    const authoritativeTotalComments = await tx.marketplaceBattleComment.count({
                        where: {
                            battleId,
                            deletedAt: null,
                        },
                    });

                    const transition = await tx.marketplaceBattle.updateMany({
                        where: {
                            id: battleId,
                            sellerId,
                            status: {
                                in: [MarketplaceBattleStatus.SCHEDULED, MarketplaceBattleStatus.LIVE],
                            },
                        },
                        data: {
                            status: MarketplaceBattleStatus.CANCELLED,
                            outcome: MarketplaceBattleOutcome.CANCELLED,
                            winnerParticipantId: null,
                            completedAt: null,
                            totalVotes: authoritativeTotalVotes,
                            totalComments: authoritativeTotalComments,
                        },
                    });

                    if (transition.count !== 1) {
                        const latest = await tx.marketplaceBattle.findUnique({
                            where: { id: battleId },
                            select: {
                                id: true,
                                sellerId: true,
                                status: true,
                            },
                        });

                        if (!latest) {
                            throw new NotFoundException('Marketplace battle not found');
                        }

                        if (latest.sellerId !== sellerId) {
                            throw new ForbiddenException('Forbidden: you do not own this marketplace battle');
                        }

                        if (latest.status === MarketplaceBattleStatus.DRAFT) {
                            throw new BadRequestException(
                                'Draft marketplace battles must be deleted using the draft delete endpoint.',
                            );
                        }

                        if (latest.status === MarketplaceBattleStatus.COMPLETED) {
                            throw new ConflictException('Marketplace battle is no longer cancellable');
                        }

                        if (latest.status === MarketplaceBattleStatus.CANCELLED) {
                            throw new ConflictException('Marketplace battle is already cancelled');
                        }

                        throw new ConflictException('Marketplace battle is no longer cancellable');
                    }

                    const cancelledBattle = await tx.marketplaceBattle.findUnique({
                        where: { id: battleId },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            category: true,
                            status: true,
                            outcome: true,
                            startAt: true,
                            endAt: true,
                            publishedAt: true,
                            completedAt: true,
                            winnerParticipantId: true,
                            totalVotes: true,
                            totalComments: true,
                            participants: {
                                orderBy: { position: 'asc' },
                                select: {
                                    id: true,
                                    position: true,
                                    voteCount: true,
                                    isWinner: true,
                                    product: {
                                        select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                                    },
                                },
                            },
                        },
                    });

                    if (!cancelledBattle) {
                        throw new NotFoundException('Marketplace battle not found');
                    }

                    await this.createMarketplaceBattleNotification(tx, {
                        userId: sellerId,
                        type: 'marketplace_battle_cancelled',
                        title: 'Marketplace Battle Cancelled',
                        body: `Your marketplace battle "${cancelledBattle.title || cancelledBattle.id}" was cancelled.`,
                        dedupeKey: `marketplace_battle_cancelled:${cancelledBattle.id}`,
                        metadata: {
                            battleId: cancelledBattle.id,
                            status: cancelledBattle.status,
                            outcome: cancelledBattle.outcome,
                        },
                    });

                    return {
                        message: 'Marketplace battle cancelled successfully',
                        battle: cancelledBattle,
                    };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error: any) {
            if (
                typeof error?.message === 'string' &&
                error.message.toLowerCase().includes('could not serialize access')
            ) {
                throw new BadRequestException('Please retry cancelling the marketplace battle');
            }
            throw error;
        }
    }

    async createChallengeBattle(userId: string, battleId: string, dto: ChallengeMarketplaceBattleDto) {
        const sellerId = this.assertSellerUserId(userId);

        return this.prisma.$transaction(
            async (tx) => {
                await tx.$queryRaw`
                    SELECT id
                    FROM "MarketplaceBattle"
                    WHERE id = ${battleId}
                    FOR UPDATE
                `;

                const originalBattle: Prisma.MarketplaceBattleGetPayload<{
                    select: typeof MARKETPLACE_BATTLE_CHALLENGE_SOURCE_SELECT;
                }> | null = await tx.marketplaceBattle.findUnique({
                    where: { id: battleId },
                    select: MARKETPLACE_BATTLE_CHALLENGE_SOURCE_SELECT,
                });

                if (!originalBattle) {
                    throw new NotFoundException('Marketplace battle not found');
                }

                this.ensureOwnership(originalBattle, sellerId);

                if (originalBattle.status !== MarketplaceBattleStatus.COMPLETED) {
                    throw new BadRequestException('Only completed marketplace battles can be challenged');
                }

                if (originalBattle.outcome !== MarketplaceBattleOutcome.WINNER) {
                    throw new BadRequestException('Only completed winner marketplace battles can be challenged');
                }

                if (!originalBattle.completedAt) {
                    this.throwCompletedIntegrityError(originalBattle.id, 'missing_completedAt');
                }

                if (!originalBattle.winnerParticipantId) {
                    this.throwCompletedIntegrityError(originalBattle.id, 'winner_outcome_with_null_winner_participant_id');
                }

                const validatedParticipants = this.validateCompletedBattleIntegrity(
                    originalBattle as CompletedBattleIntegrityInput,
                );

                const winnerParticipant = validatedParticipants.find(
                    (participant) => participant.id === originalBattle.winnerParticipantId,
                );

                if (!winnerParticipant) {
                    this.throwCompletedIntegrityError(originalBattle.id, 'winner_not_found_in_participants');
                }

                const winnerProductId = winnerParticipant.productId;
                const challengerProductId = dto.challengerProductId;

                await this.validateMarketplaceBattleProducts(tx, sellerId, originalBattle.closetId, [
                    winnerProductId,
                    challengerProductId,
                ]);

                const products = await tx.closetItems.findMany({
                    where: {
                        id: { in: [winnerProductId, challengerProductId] },
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                const productById = new Map(products.map((product) => [product.id, product]));
                const winnerProduct = productById.get(winnerProductId);
                const challengerProduct = productById.get(challengerProductId);

                if (!winnerProduct || !challengerProduct) {
                    throw new BadRequestException('One or more products were not found');
                }

                const providedTitle =
                    typeof dto.title === 'string'
                        ? dto.title.trim()
                        : undefined;

                if (providedTitle !== undefined && providedTitle.length === 0) {
                    throw new BadRequestException('title should not be empty');
                }

                const finalTitle =
                    providedTitle && providedTitle.length > 0
                        ? providedTitle
                        : `${winnerProduct.name} vs ${challengerProduct.name}`;

                const newBattle = await tx.marketplaceBattle.create({
                    data: {
                        sellerId,
                        closetId: originalBattle.closetId,
                        title: finalTitle,
                        description: dto.description,
                        category: dto.category ?? originalBattle.category,
                        status: MarketplaceBattleStatus.DRAFT,
                        outcome: MarketplaceBattleOutcome.PENDING,
                        startAt: null,
                        endAt: null,
                        publishedAt: null,
                        completedAt: null,
                        winnerParticipantId: null,
                        totalVotes: 0,
                        totalComments: 0,
                    },
                    select: {
                        id: true,
                    },
                });

                await tx.marketplaceBattleParticipant.createMany({
                    data: [
                        {
                            battleId: newBattle.id,
                            productId: winnerProductId,
                            position: 1,
                            voteCount: 0,
                            isWinner: false,
                        },
                        {
                            battleId: newBattle.id,
                            productId: challengerProductId,
                            position: 2,
                            voteCount: 0,
                            isWinner: false,
                        },
                    ],
                });

                const createdChallenge = await tx.marketplaceBattle.findUnique({
                    where: { id: newBattle.id },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        category: true,
                        status: true,
                        outcome: true,
                        startAt: true,
                        endAt: true,
                        publishedAt: true,
                        completedAt: true,
                        winnerParticipantId: true,
                        totalVotes: true,
                        totalComments: true,
                        participants: {
                            orderBy: { position: 'asc' },
                            select: {
                                position: true,
                                voteCount: true,
                                isWinner: true,
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                });

                if (!createdChallenge) {
                    throw new NotFoundException('Marketplace battle not found after creation');
                }

                await this.createMarketplaceBattleNotification(tx, {
                    userId: sellerId,
                    type: 'marketplace_battle_challenge_created',
                    title: 'Marketplace Challenge Created',
                    body: `Your challenge battle "${createdChallenge.title || createdChallenge.id}" was created as draft.`,
                    dedupeKey: `marketplace_battle_challenge_created:${createdChallenge.id}`,
                    metadata: {
                        battleId: createdChallenge.id,
                        sourceBattleId: originalBattle.id,
                        winnerProductId,
                        challengerProductId,
                        status: createdChallenge.status,
                    },
                });

                return {
                    message: 'Marketplace challenge battle created successfully',
                    sourceBattle: {
                        id: originalBattle.id,
                        winnerParticipantId: originalBattle.winnerParticipantId,
                        winnerProductId,
                    },
                    battle: {
                        id: createdChallenge.id,
                        title: createdChallenge.title,
                        description: createdChallenge.description,
                        category: createdChallenge.category,
                        status: createdChallenge.status,
                        outcome: createdChallenge.outcome,
                        startAt: createdChallenge.startAt,
                        endAt: createdChallenge.endAt,
                        publishedAt: createdChallenge.publishedAt,
                        completedAt: createdChallenge.completedAt,
                        winnerParticipantId: createdChallenge.winnerParticipantId,
                        totalVotes: createdChallenge.totalVotes,
                        totalComments: createdChallenge.totalComments,
                        participants: createdChallenge.participants.map((participant) => ({
                            position: participant.position,
                            voteCount: participant.voteCount,
                            isWinner: participant.isWinner,
                            product: {
                                id: participant.product?.id,
                                name: participant.product?.name,
                            },
                        })),
                    },
                };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }

    async publishDraftBattle(userId: string, battleId: string, dto: PublishMarketplaceBattleDto) {
        const sellerId = this.assertSellerUserId(userId);

        const now = new Date();
        const endAt = new Date(dto.endAt);
        if (Number.isNaN(endAt.getTime())) {
            throw new BadRequestException('Invalid endAt');
        }

        const explicitStartAt = dto.startAt ? new Date(dto.startAt) : undefined;
        if (explicitStartAt && Number.isNaN(explicitStartAt.getTime())) {
            throw new BadRequestException('Invalid startAt');
        }

        if (explicitStartAt && explicitStartAt.getTime() < now.getTime() - PAST_START_TOLERANCE_MS) {
            throw new BadRequestException('startAt is too far in the past');
        }

        const effectiveStartAt = explicitStartAt ?? now;

        if (endAt.getTime() <= effectiveStartAt.getTime()) {
            throw new BadRequestException('endAt must be greater than startAt');
        }

        const targetStatus =
            effectiveStartAt.getTime() <= now.getTime()
                ? MarketplaceBattleStatus.LIVE
                : MarketplaceBattleStatus.SCHEDULED;

        return this.prisma.$transaction(async (tx) => {
            const battle = await tx.marketplaceBattle.findUnique({
                where: { id: battleId },
                select: {
                    id: true,
                    sellerId: true,
                    closetId: true,
                    status: true,
                    title: true,
                    participants: {
                        select: {
                            id: true,
                            productId: true,
                            position: true,
                        },
                    },
                },
            });

            if (!battle) throw new NotFoundException('Marketplace battle not found');
            this.ensureOwnership(battle, sellerId);
            if (battle.status !== MarketplaceBattleStatus.DRAFT) {
                throw new BadRequestException('Only draft marketplace battles can be published');
            }

            if (!battle.title || battle.title.trim() === '') {
                throw new BadRequestException('Battle title is required before publishing');
            }

            if (battle.participants.length !== 2) {
                throw new BadRequestException('Marketplace battle must have exactly two participants');
            }

            const participantPositions = battle.participants
                .map((participant) => participant.position)
                .sort((a, b) => a - b);

            if (participantPositions[0] !== 1 || participantPositions[1] !== 2) {
                throw new BadRequestException('Participant positions must be exactly 1 and 2');
            }

            const productIds = battle.participants.map((participant) => participant.productId);
            if (new Set(productIds).size !== 2) {
                throw new BadRequestException('Participants must reference two different products');
            }

            await this.validateMarketplaceBattleProducts(tx, sellerId, battle.closetId, productIds);

            const updated = await tx.marketplaceBattle.updateMany({
                where: {
                    id: battleId,
                    sellerId,
                    status: MarketplaceBattleStatus.DRAFT,
                },
                data: {
                    status: targetStatus,
                    startAt: effectiveStartAt,
                    endAt,
                    publishedAt: now,
                },
            });

            if (updated.count !== 1) {
                const latest = await tx.marketplaceBattle.findUnique({
                    where: { id: battleId },
                    select: { id: true, sellerId: true, status: true },
                });

                if (!latest) throw new NotFoundException('Marketplace battle not found');
                this.ensureOwnership(latest, sellerId);

                if (latest.status !== MarketplaceBattleStatus.DRAFT) {
                    throw new BadRequestException('Marketplace battle is no longer draft and cannot be published');
                }

                throw new BadRequestException('Unable to publish marketplace battle');
            }

            const publishedBattle = await tx.marketplaceBattle.findUnique({
                where: { id: battleId },
                select: {
                    ...MARKETPLACE_BATTLE_BASE_SELECT,
                    participants: {
                        orderBy: { position: 'asc' },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            createdAt: true,
                            updatedAt: true,
                            product: {
                                select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                            },
                        },
                    },
                    winnerParticipant: {
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                            voteCount: true,
                            isWinner: true,
                            product: {
                                select: MARKETPLACE_BATTLE_PRODUCT_SELECT,
                            },
                        },
                    },
                },
            });

            if (!publishedBattle) {
                throw new NotFoundException('Marketplace battle not found after publish');
            }

            if (targetStatus === MarketplaceBattleStatus.LIVE) {
                await this.createMarketplaceBattleNotification(tx, {
                    userId: sellerId,
                    type: 'marketplace_battle_live',
                    title: 'Marketplace Battle Is Live',
                    body: `Your marketplace battle "${publishedBattle.title || publishedBattle.id}" is now live.`,
                    dedupeKey: `marketplace_battle_live:${publishedBattle.id}`,
                    metadata: {
                        battleId: publishedBattle.id,
                        status: publishedBattle.status,
                        startAt: publishedBattle.startAt?.toISOString(),
                        endAt: publishedBattle.endAt?.toISOString(),
                    },
                });
            }

            return publishedBattle;
        });
    }
}
