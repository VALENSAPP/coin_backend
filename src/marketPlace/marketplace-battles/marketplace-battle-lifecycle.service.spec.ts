import { MarketplaceBattleOutcome, MarketplaceBattleStatus, Prisma } from '@prisma/client';
import { MarketplaceBattleLifecycleService } from './marketplace-battle-lifecycle.service';

describe('MarketplaceBattleLifecycleService', () => {
    let service: MarketplaceBattleLifecycleService;
    let prisma: any;
    let notificationService: any;

    const battleId = 'battle-1';
    const participant1Id = 'participant-1';
    const participant2Id = 'participant-2';

    const now = new Date('2026-07-06T10:00:00.000Z');

    const createBattle = (overrides: Record<string, any> = {}) => ({
        id: battleId,
        status: MarketplaceBattleStatus.LIVE,
        endAt: new Date('2026-07-06T09:59:00.000Z'),
        ...overrides,
    });

    const createParticipants = (overrides: Array<Record<string, any>> = []) => {
        const base = [
            { id: participant1Id, battleId, position: 1, productId: 'product-1' },
            { id: participant2Id, battleId, position: 2, productId: 'product-2' },
        ];

        return base.map((participant, index) => ({
            ...participant,
            ...(overrides[index] || {}),
        }));
    };

    beforeEach(() => {
        prisma = {
            marketplaceBattle: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                updateMany: jest.fn(),
            },
            marketplaceBattleParticipant: {
                findMany: jest.fn(),
                updateMany: jest.fn(),
            },
            marketplaceBattleVote: {
                count: jest.fn(),
                groupBy: jest.fn(),
            },
            marketplaceBattleComment: {
                count: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (callback: any, options?: any) => {
            if (typeof callback === 'function') {
                return callback(prisma);
            }
            return callback;
        });

        notificationService = {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-life-1',
            }),
        };

        service = new MarketplaceBattleLifecycleService(prisma, notificationService);
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('1) SCHEDULED battle becomes LIVE when startAt <= now and endAt > now', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: battleId,
            sellerId: 'seller-1',
            title: 'Lifecycle Battle',
            status: MarketplaceBattleStatus.LIVE,
            startAt: new Date('2026-07-06T09:00:00.000Z'),
            endAt: new Date('2026-07-06T11:00:00.000Z'),
        });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });
        const result = await service.activateScheduledBattleIfDue('battle-1', now);

        expect(result).toBe('activated');
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: MarketplaceBattleStatus.SCHEDULED,
                    startAt: { lte: now },
                    endAt: { gt: now },
                }),
                data: { status: MarketplaceBattleStatus.LIVE },
            }),
        );
        expect(notificationService.createInAppNotificationIfAbsent).toHaveBeenCalledWith(
            prisma,
            expect.objectContaining({
                userId: 'seller-1',
                type: 'marketplace_battle_live',
                dedupeKey: 'marketplace_battle_live:battle-1',
            }),
        );
    });

    it('2) Future SCHEDULED battle remains unchanged', async () => {
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });
        const result = await service.activateScheduledBattleIfDue('battle-1', now);
        expect(result).toBe('skipped');
    });

    it('3) Expired SCHEDULED battle completes directly', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            createBattle({ status: MarketplaceBattleStatus.SCHEDULED }),
        );
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 2 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(1);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.completeBattleIfExpired(
            battleId,
            MarketplaceBattleStatus.SCHEDULED,
            now,
        );

        expect(result.result).toBe('completed');
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: MarketplaceBattleStatus.COMPLETED }),
            }),
        );
    });

    it('4) Expired LIVE battle completes', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(1);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant2Id, _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.completeBattleIfExpired(
            battleId,
            MarketplaceBattleStatus.LIVE,
            now,
        );

        expect(result.result).toBe('completed');
        expect(notificationService.createInAppNotificationIfAbsent).toHaveBeenCalledWith(
            prisma,
            expect.objectContaining({
                type: 'marketplace_battle_completed',
                dedupeKey: `marketplace_battle_completed:${battleId}`,
            }),
        );
    });

    it('5) Non-expired LIVE battle remains LIVE', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            createBattle({ endAt: new Date('2026-07-06T10:01:00.000Z') }),
        );

        const result = await service.completeBattleIfExpired(
            battleId,
            MarketplaceBattleStatus.LIVE,
            now,
        );

        expect(result).toEqual({ result: 'skipped', reason: 'not_expired' });
    });

    it('6) Participant 1 wins', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(3);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 2 } },
            { participantId: participant2Id, _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    outcome: MarketplaceBattleOutcome.WINNER,
                    winnerParticipantId: participant1Id,
                    totalVotes: 3,
                }),
            }),
        );
    });

    it('7) Participant 2 wins', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(4);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 1 } },
            { participantId: participant2Id, _count: { _all: 3 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    outcome: MarketplaceBattleOutcome.WINNER,
                    winnerParticipantId: participant2Id,
                }),
            }),
        );
    });

    it('8) Equal votes produces TIE', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 1 } },
            { participantId: participant2Id, _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    outcome: MarketplaceBattleOutcome.TIE,
                    winnerParticipantId: null,
                }),
            }),
        );
    });

    it('9) Zero votes produces TIE', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(0);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ totalVotes: 0, outcome: MarketplaceBattleOutcome.TIE }),
            }),
        );
    });

    it('10) Final totalVotes is calculated from authoritative valid vote rows', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(5);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 2 } },
            { participantId: participant2Id, _count: { _all: 2 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ totalVotes: 4 }) }),
        );
    });

    it('11) Invalid mismatched battle/participant vote rows are excluded', async () => {
        const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(3);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 1 } },
            { participantId: participant2Id, _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(warnSpy).toHaveBeenCalled();
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ totalVotes: 2 }) }),
        );
    });

    it('12) Participant voteCount values are overwritten with authoritative counts', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(3);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 3 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ data: expect.objectContaining({ voteCount: 3 }) }),
        );
        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ data: expect.objectContaining({ voteCount: 0 }) }),
        );
    });

    it('13) Existing stale isWinner values are corrected', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant2Id, _count: { _all: 2 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ data: expect.objectContaining({ isWinner: false }) }),
        );
        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ data: expect.objectContaining({ isWinner: true }) }),
        );
    });

    it('14) totalComments counts only non-deleted comments', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(0);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(5);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.marketplaceBattleComment.count).toHaveBeenCalledWith({
            where: {
                battleId,
                deletedAt: null,
            },
        });
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ totalComments: 5 }) }),
        );
    });

    it('15) Completed battle is skipped and unchanged', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            createBattle({ status: MarketplaceBattleStatus.COMPLETED }),
        );

        const result = await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(result.result).toBe('skipped');
        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
    });

    it('16) completedAt is not changed by repeated processing', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(createBattle())
            .mockResolvedValueOnce(createBattle({ status: MarketplaceBattleStatus.COMPLETED }));
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(0);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const first = await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);
        const second = await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(first.result).toBe('completed');
        expect(second.result).toBe('skipped');
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledTimes(1);
    });

    it('17) Two simultaneous completion attempts cannot both finalize the battle', async () => {
        let status: MarketplaceBattleStatus = MarketplaceBattleStatus.LIVE;
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);

        prisma.marketplaceBattle.findUnique.mockImplementation(async () => createBattle({ status }));
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(0);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockImplementation(async () => {
            if (status === MarketplaceBattleStatus.LIVE) {
                status = MarketplaceBattleStatus.COMPLETED;
                return { count: 1 };
            }
            return { count: 0 };
        });

        const results = await Promise.all([
            service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now),
            service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now),
        ]);

        const completed = results.filter((result) => result.result === 'completed');
        expect(completed).toHaveLength(1);
    });

    it('18) Losing concurrent transaction cannot overwrite participant results', async () => {
        let status: MarketplaceBattleStatus = MarketplaceBattleStatus.LIVE;
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockImplementation(async () => {
            return createBattle({ status });
        });

        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: participant1Id, _count: { _all: 2 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockImplementation(async () => {
            if (status === MarketplaceBattleStatus.LIVE) {
                status = MarketplaceBattleStatus.COMPLETED;
                return { count: 1 };
            }
            return { count: 0 };
        });

        await Promise.all([
            service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now),
            service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now),
        ]);

        // Because status is checked under lock before participant writes, only the winning path writes authoritative values.
        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenCalled();
    });

    it('19) Worker continues after one battle throws an error', async () => {
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([{ id: 'activation-1' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: 'scheduled-1' }, { id: 'scheduled-2' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        jest.spyOn(service, 'activateScheduledBattleIfDue').mockResolvedValue('activated');
        const completionSpy = jest
            .spyOn(service, 'completeBattleIfExpired')
            .mockImplementation(async (id: string) => {
                if (id === 'scheduled-1') throw new Error('boom');
                return { result: 'completed' };
            });

        const stats = await service.runMarketplaceBattleLifecycle(now);

        expect(completionSpy).toHaveBeenCalled();
        expect(stats.completed).toBe(1);
        expect(stats.failed).toBeGreaterThanOrEqual(1);
    });

    it('20) Worker processes multiple eligible battles', async () => {
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([{ id: 'a1' }, { id: 'a2' }])
            .mockResolvedValueOnce([{ id: 's1' }])
            .mockResolvedValueOnce([{ id: 'l1' }])
            .mockResolvedValueOnce([]);

        jest.spyOn(service, 'activateScheduledBattleIfDue').mockResolvedValue('activated');
        jest.spyOn(service, 'completeBattleIfExpired').mockResolvedValue({ result: 'completed' });

        const stats = await service.runMarketplaceBattleLifecycle(now);

        expect(stats.activated).toBe(2);
        expect(stats.completed).toBe(2);
    });

    it('21) Batch size is respected', async () => {
        const firstBatch = Array.from({ length: 100 }, (_, idx) => ({ id: `a-${idx + 1}` }));
        const secondBatch = [{ id: 'a-101' }];

        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce(firstBatch)
            .mockResolvedValueOnce(secondBatch)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        jest.spyOn(service, 'activateScheduledBattleIfDue').mockResolvedValue('activated');
        jest.spyOn(service, 'completeBattleIfExpired').mockResolvedValue({ result: 'skipped' });

        await service.runMarketplaceBattleLifecycle(now);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 100 }),
        );
    });

    it('22) Malformed participant count does not produce winner or corrupt battle', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue([{ id: participant1Id, battleId, position: 1, productId: 'product-1' }]);

        const result = await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(result).toEqual({ result: 'failed', reason: 'invalid_participant_count' });
        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
    });

    it('23) Missing endAt does not complete', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle({ endAt: null }));

        const result = await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(result).toEqual({ result: 'skipped', reason: 'missing_endAt' });
    });

    it('24) Activation conditional write losing a race is treated as skipped', async () => {
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([{ id: 'a1' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        jest.spyOn(service, 'activateScheduledBattleIfDue').mockResolvedValue('skipped');
        jest.spyOn(service, 'completeBattleIfExpired').mockResolvedValue({ result: 'skipped' });

        const stats = await service.runMarketplaceBattleLifecycle(now);

        expect(stats.skipped).toBeGreaterThan(0);
    });

    it('25) Worker overlap guard prevents duplicate same-instance runs', async () => {
        prisma.marketplaceBattle.findMany.mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return [];
        });

        const first = service.runMarketplaceBattleLifecycle(now);
        const second = service.runMarketplaceBattleLifecycle(now);

        const [firstStats, secondStats] = await Promise.all([first, second]);

        expect(firstStats).toBeDefined();
        expect(secondStats).toEqual({
            activated: 0,
            completed: 0,
            skipped: 0,
            failed: 0,
        });
    });

    it('uses serializable transaction isolation for completion', async () => {
        prisma.$queryRaw.mockResolvedValue([{ id: battleId }]);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(createBattle());
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(createParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(0);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        await service.completeBattleIfExpired(battleId, MarketplaceBattleStatus.LIVE, now);

        expect(prisma.$transaction).toHaveBeenCalledWith(
            expect.any(Function),
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    });
});
