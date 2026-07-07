import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
    Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';

const MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE = 100;

type CompletionExpectedStatus =
    | 'SCHEDULED'
    | 'LIVE';

type CompletionResult = {
    result: 'completed' | 'skipped' | 'failed';
    reason?: string;
};

type LifecycleRunStats = {
    activated: number;
    completed: number;
    skipped: number;
    failed: number;
};

@Injectable()
export class MarketplaceBattleLifecycleService {
    private readonly logger = new Logger(MarketplaceBattleLifecycleService.name);
    private isRunning = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) { }

    private async createMarketplaceBattleNotification(
        prismaClient: PrismaService | Prisma.TransactionClient,
        payload: {
            userId: string;
            type: string;
            title: string;
            body: string;
            dedupeKey: string;
            metadata?: Record<string, any>;
        },
    ): Promise<void> {
        await this.notificationService.createInAppNotificationIfAbsent(prismaClient, payload);
    }

    @Cron('*/1 * * * *')
    async runMarketplaceBattleLifecycleCron() {
        await this.runMarketplaceBattleLifecycle();
    }

    async runMarketplaceBattleLifecycle(now: Date = new Date()): Promise<LifecycleRunStats> {
        if (this.isRunning) {
            this.logger.warn('Skipping lifecycle run because previous run is still executing');
            return {
                activated: 0,
                completed: 0,
                skipped: 0,
                failed: 0,
            };
        }

        this.isRunning = true;

        const stats: LifecycleRunStats = {
            activated: 0,
            completed: 0,
            skipped: 0,
            failed: 0,
        };

        this.logger.debug(`Marketplace lifecycle worker started at ${now.toISOString()}`);

        try {
            await this.processScheduledActivations(now, stats);
            await this.processExpiredScheduledBattles(now, stats);
            await this.processExpiredLiveBattles(now, stats);

            this.logger.debug(
                `Marketplace lifecycle worker finished: activated=${stats.activated}, completed=${stats.completed}, skipped=${stats.skipped}, failed=${stats.failed}`,
            );

            return stats;
        } finally {
            this.isRunning = false;
        }
    }

    async activateScheduledBattleIfDue(battleId: string, now: Date): Promise<'activated' | 'skipped'> {
        const updated = await this.prisma.marketplaceBattle.updateMany({
            where: {
                id: battleId,
                status: MarketplaceBattleStatus.SCHEDULED,
                startAt: { lte: now },
                endAt: { gt: now },
            },
            data: {
                status: MarketplaceBattleStatus.LIVE,
            },
        });

        if (updated.count === 1) {
            const activatedBattle = await this.prisma.marketplaceBattle.findUnique({
                where: { id: battleId },
                select: {
                    id: true,
                    sellerId: true,
                    title: true,
                    status: true,
                    startAt: true,
                    endAt: true,
                },
            });

            if (activatedBattle) {
                await this.createMarketplaceBattleNotification(this.prisma, {
                    userId: activatedBattle.sellerId,
                    type: 'marketplace_battle_live',
                    title: 'Marketplace Battle Is Live',
                    body: `Your marketplace battle "${activatedBattle.title || activatedBattle.id}" is now live.`,
                    dedupeKey: `marketplace_battle_live:${activatedBattle.id}`,
                    metadata: {
                        battleId: activatedBattle.id,
                        status: activatedBattle.status,
                        startAt: activatedBattle.startAt?.toISOString(),
                        endAt: activatedBattle.endAt?.toISOString(),
                    },
                });
            }
        }

        return updated.count === 1 ? 'activated' : 'skipped';
    }

    async completeBattleIfExpired(
        battleId: string,
        expectedStatus: CompletionExpectedStatus,
        now: Date,
    ): Promise<CompletionResult> {
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
                            title: true,
                            status: true,
                            endAt: true,
                        },
                    });

                    if (!battle) {
                        return { result: 'skipped', reason: 'battle_not_found' };
                    }

                    if (battle.status !== expectedStatus) {
                        return { result: 'skipped', reason: 'status_mismatch' };
                    }

                    if (!battle.endAt) {
                        return { result: 'skipped', reason: 'missing_endAt' };
                    }

                    if (battle.endAt.getTime() > now.getTime()) {
                        return { result: 'skipped', reason: 'not_expired' };
                    }

                    const participants = await tx.marketplaceBattleParticipant.findMany({
                        where: { battleId },
                        select: {
                            id: true,
                            battleId: true,
                            productId: true,
                            position: true,
                        },
                    });

                    if (participants.length !== 2) {
                        this.logger.error(
                            `Battle ${battleId} completion skipped due to invalid participant count: ${participants.length}`,
                        );
                        return { result: 'failed', reason: 'invalid_participant_count' };
                    }

                    const sortedByPosition = [...participants].sort((a, b) => a.position - b.position);
                    const validPositions = sortedByPosition[0].position === 1 && sortedByPosition[1].position === 2;
                    if (!validPositions) {
                        this.logger.error(`Battle ${battleId} completion skipped due to invalid participant positions`);
                        return { result: 'failed', reason: 'invalid_participant_positions' };
                    }

                    const uniqueProductCount = new Set(participants.map((participant) => participant.productId)).size;
                    if (uniqueProductCount !== 2) {
                        this.logger.error(`Battle ${battleId} completion skipped due to duplicate participant products`);
                        return { result: 'failed', reason: 'duplicate_participant_products' };
                    }

                    const validParticipantIds = participants.map((participant) => participant.id);

                    const totalVotesByBattle = await tx.marketplaceBattleVote.count({
                        where: { battleId },
                    });

                    const groupedVotes = await tx.marketplaceBattleVote.groupBy({
                        by: ['participantId'],
                        where: {
                            battleId,
                            participantId: {
                                in: validParticipantIds,
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

                    const validVoteCount = groupedVotes.reduce(
                        (sum, groupedVote) => sum + groupedVote._count._all,
                        0,
                    );
                    const invalidVoteCount = totalVotesByBattle - validVoteCount;

                    if (invalidVoteCount > 0) {
                        this.logger.warn(
                            `Battle ${battleId} has ${invalidVoteCount} invalid vote rows with mismatched participant linkage; ignored in final tally`,
                        );
                    }

                    const participantOne = sortedByPosition[0];
                    const participantTwo = sortedByPosition[1];

                    const participantOneVotes = voteCountByParticipant.get(participantOne.id) || 0;
                    const participantTwoVotes = voteCountByParticipant.get(participantTwo.id) || 0;
                    const authoritativeTotalVotes = participantOneVotes + participantTwoVotes;

                    let outcome: MarketplaceBattleOutcome = MarketplaceBattleOutcome.TIE;
                    let winnerParticipantId: string | null = null;
                    let participantOneIsWinner = false;
                    let participantTwoIsWinner = false;

                    if (participantOneVotes > participantTwoVotes) {
                        outcome = MarketplaceBattleOutcome.WINNER;
                        winnerParticipantId = participantOne.id;
                        participantOneIsWinner = true;
                    } else if (participantTwoVotes > participantOneVotes) {
                        outcome = MarketplaceBattleOutcome.WINNER;
                        winnerParticipantId = participantTwo.id;
                        participantTwoIsWinner = true;
                    }

                    await tx.marketplaceBattleParticipant.updateMany({
                        where: { id: participantOne.id, battleId },
                        data: {
                            voteCount: participantOneVotes,
                            isWinner: participantOneIsWinner,
                        },
                    });

                    await tx.marketplaceBattleParticipant.updateMany({
                        where: { id: participantTwo.id, battleId },
                        data: {
                            voteCount: participantTwoVotes,
                            isWinner: participantTwoIsWinner,
                        },
                    });

                    const authoritativeTotalComments = await tx.marketplaceBattleComment.count({
                        where: {
                            battleId,
                            deletedAt: null,
                        },
                    });

                    const finalized = await tx.marketplaceBattle.updateMany({
                        where: {
                            id: battleId,
                            status: expectedStatus,
                            endAt: {
                                lte: now,
                            },
                        },
                        data: {
                            status: MarketplaceBattleStatus.COMPLETED,
                            outcome,
                            winnerParticipantId,
                            totalVotes: authoritativeTotalVotes,
                            totalComments: authoritativeTotalComments,
                            completedAt: now,
                        },
                    });

                    if (finalized.count !== 1) {
                        return { result: 'skipped', reason: 'finalize_race_lost' };
                    }

                    await this.createMarketplaceBattleNotification(tx, {
                        userId: battle.sellerId,
                        type: 'marketplace_battle_completed',
                        title:
                            outcome === MarketplaceBattleOutcome.TIE
                                ? 'Marketplace Battle Ended In Tie'
                                : 'Marketplace Battle Completed',
                        body:
                            outcome === MarketplaceBattleOutcome.TIE
                                ? `Your marketplace battle "${battle.title || battle.id}" ended in a tie.`
                                : `Your marketplace battle "${battle.title || battle.id}" has a winner.`,
                        dedupeKey: `marketplace_battle_completed:${battle.id}`,
                        metadata: {
                            battleId: battle.id,
                            status: MarketplaceBattleStatus.COMPLETED,
                            outcome,
                            winnerParticipantId,
                            totalVotes: String(authoritativeTotalVotes),
                            totalComments: String(authoritativeTotalComments),
                        },
                    });

                    return { result: 'completed' };
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
        } catch (error: any) {
            // Prisma can surface serialization conflicts as transaction errors.
            if (
                typeof error?.message === 'string' &&
                error.message.toLowerCase().includes('could not serialize access')
            ) {
                return { result: 'skipped', reason: 'serialization_conflict' };
            }
            throw error;
        }
    }

    private async processScheduledActivations(now: Date, stats: LifecycleRunStats) {
        const processedIds = new Set<string>();

        while (true) {
            const batch = await this.prisma.marketplaceBattle.findMany({
                where: {
                    status: MarketplaceBattleStatus.SCHEDULED,
                    startAt: { lte: now },
                    endAt: { gt: now },
                    ...(processedIds.size > 0
                        ? {
                            id: {
                                notIn: Array.from(processedIds),
                            },
                        }
                        : {}),
                },
                select: { id: true },
                orderBy: { startAt: 'asc' },
                take: MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE,
            });

            if (batch.length === 0) break;

            for (const battle of batch) {
                processedIds.add(battle.id);
                try {
                    const activation = await this.activateScheduledBattleIfDue(battle.id, now);
                    if (activation === 'activated') {
                        stats.activated += 1;
                    } else {
                        stats.skipped += 1;
                    }
                } catch (error: any) {
                    stats.failed += 1;
                    this.logger.error(
                        `Failed activating scheduled battle ${battle.id}: ${error?.message || error}`,
                    );
                }
            }

            if (batch.length < MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE) break;
        }
    }

    private async processExpiredScheduledBattles(now: Date, stats: LifecycleRunStats) {
        const processedIds = new Set<string>();

        while (true) {
            const batch = await this.prisma.marketplaceBattle.findMany({
                where: {
                    status: MarketplaceBattleStatus.SCHEDULED,
                    endAt: { lte: now },
                    ...(processedIds.size > 0
                        ? {
                            id: {
                                notIn: Array.from(processedIds),
                            },
                        }
                        : {}),
                },
                select: { id: true },
                orderBy: { endAt: 'asc' },
                take: MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE,
            });

            if (batch.length === 0) break;

            for (const battle of batch) {
                processedIds.add(battle.id);
                try {
                    const completion = await this.completeBattleIfExpired(
                        battle.id,
                        MarketplaceBattleStatus.SCHEDULED,
                        now,
                    );
                    if (completion.result === 'completed') {
                        stats.completed += 1;
                    } else if (completion.result === 'failed') {
                        stats.failed += 1;
                    } else {
                        stats.skipped += 1;
                    }
                } catch (error: any) {
                    stats.failed += 1;
                    this.logger.error(
                        `Failed completing expired scheduled battle ${battle.id}: ${error?.message || error}`,
                    );
                }
            }

            if (batch.length < MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE) break;
        }
    }

    private async processExpiredLiveBattles(now: Date, stats: LifecycleRunStats) {
        const processedIds = new Set<string>();

        while (true) {
            const batch = await this.prisma.marketplaceBattle.findMany({
                where: {
                    status: MarketplaceBattleStatus.LIVE,
                    endAt: { lte: now },
                    ...(processedIds.size > 0
                        ? {
                            id: {
                                notIn: Array.from(processedIds),
                            },
                        }
                        : {}),
                },
                select: { id: true },
                orderBy: { endAt: 'asc' },
                take: MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE,
            });

            if (batch.length === 0) break;

            for (const battle of batch) {
                processedIds.add(battle.id);
                try {
                    const completion = await this.completeBattleIfExpired(
                        battle.id,
                        MarketplaceBattleStatus.LIVE,
                        now,
                    );
                    if (completion.result === 'completed') {
                        stats.completed += 1;
                    } else if (completion.result === 'failed') {
                        stats.failed += 1;
                    } else {
                        stats.skipped += 1;
                    }
                } catch (error: any) {
                    stats.failed += 1;
                    this.logger.error(
                        `Failed completing expired live battle ${battle.id}: ${error?.message || error}`,
                    );
                }
            }

            if (batch.length < MARKETPLACE_BATTLE_LIFECYCLE_BATCH_SIZE) break;
        }
    }
}
