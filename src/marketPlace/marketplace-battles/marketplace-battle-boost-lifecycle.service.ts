import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketplaceBattleBoostStatus, MarketplaceBattleOutcome, MarketplaceBattleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const BOOST_LIFECYCLE_BATCH_SIZE = 100;

@Injectable()
export class MarketplaceBattleBoostLifecycleService {
    private readonly logger = new Logger(MarketplaceBattleBoostLifecycleService.name);
    private isRunning = false;

    constructor(private readonly prisma: PrismaService) { }

    @Cron('*/1 * * * *')
    async runBoostLifecycleCron() {
        await this.runBoostLifecycle();
    }

    async runBoostLifecycle(now: Date = new Date()) {
        if (this.isRunning) {
            this.logger.warn('Skipping boost lifecycle run because previous run is still executing');
            return { expired: 0, skipped: 0, failed: 0 };
        }

        this.isRunning = true;
        const stats = { expired: 0, skipped: 0, failed: 0 };

        try {
            const processed = new Set<string>();

            while (true) {
                const batch = await this.prisma.marketplaceBattleBoost.findMany({
                    where: {
                        status: MarketplaceBattleBoostStatus.ACTIVE,
                        ...(processed.size > 0
                            ? {
                                id: { notIn: Array.from(processed) },
                            }
                            : {}),
                    },
                    select: {
                        id: true,
                        endAt: true,
                        winnerBadge: true,
                        badgeStartAt: true,
                        badgeEndAt: true,
                        battle: {
                            select: {
                                status: true,
                                outcome: true,
                                endAt: true,
                            },
                        },
                    },
                    orderBy: { updatedAt: 'asc' },
                    take: BOOST_LIFECYCLE_BATCH_SIZE,
                });

                if (batch.length === 0) break;

                for (const boost of batch) {
                    processed.add(boost.id);
                    try {
                        if (
                            boost.winnerBadge &&
                            !boost.badgeStartAt &&
                            boost.battle.status === MarketplaceBattleStatus.COMPLETED &&
                            boost.battle.outcome === MarketplaceBattleOutcome.WINNER &&
                            !!boost.badgeEndAt &&
                            boost.badgeEndAt > now
                        ) {
                            await this.prisma.marketplaceBattleBoost.updateMany({
                                where: {
                                    id: boost.id,
                                    status: MarketplaceBattleBoostStatus.ACTIVE,
                                    badgeStartAt: null,
                                },
                                data: {
                                    badgeStartAt: now,
                                },
                            });
                        }

                        const shouldExpireByTime = !!boost.endAt && boost.endAt <= now;
                        const shouldExpireByBattle = boost.battle.status === MarketplaceBattleStatus.CANCELLED;

                        if (!shouldExpireByTime && !shouldExpireByBattle) {
                            stats.skipped += 1;
                            continue;
                        }

                        const updated = await this.prisma.marketplaceBattleBoost.updateMany({
                            where: {
                                id: boost.id,
                                status: MarketplaceBattleBoostStatus.ACTIVE,
                            },
                            data: {
                                status: MarketplaceBattleBoostStatus.EXPIRED,
                                expiredAt: now,
                            },
                        });

                        if (updated.count === 1) {
                            stats.expired += 1;
                        } else {
                            stats.skipped += 1;
                        }
                    } catch {
                        stats.failed += 1;
                    }
                }

                if (batch.length < BOOST_LIFECYCLE_BATCH_SIZE) break;
            }

            return stats;
        } finally {
            this.isRunning = false;
        }
    }
}
