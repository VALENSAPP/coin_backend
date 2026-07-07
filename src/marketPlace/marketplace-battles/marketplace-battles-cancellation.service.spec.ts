import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
} from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 12 Cancellation)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;
    let notificationService: any;

    const battleId = 'battle-1';
    const sellerId = 'seller-1';
    const otherSellerId = 'seller-2';

    const makeSourceBattle = (
        status: MarketplaceBattleStatus,
        overrides: Record<string, any> = {},
    ) => ({
        id: battleId,
        sellerId,
        status,
        startAt: new Date('2026-07-06T09:00:00.000Z'),
        endAt: new Date('2026-07-06T11:00:00.000Z'),
        publishedAt: new Date('2026-07-06T08:59:00.000Z'),
        completedAt: null,
        ...overrides,
    });

    const makeParticipants = (overrides: Array<Record<string, any>> = []) => {
        const base = [
            {
                id: 'participant-1',
                battleId,
                productId: 'product-1',
                position: 1,
                voteCount: 0,
                isWinner: true,
                product: {
                    id: 'product-1',
                    closetId: 'closet-1',
                    userId: sellerId,
                    images: ['p1.jpg'],
                    name: 'Product A',
                    category: 'Fashion',
                    brand: 'Brand A',
                    condition: 'NEW',
                    description: null,
                    price: 100,
                    quantity: 2,
                    isActive: true,
                    isDeleted: false,
                    shippingOption: 'ship_items',
                    shippingFee: null,
                    estimateShippingTime: null,
                    pickupAddress: null,
                    pickupAvailableHours: null,
                    buyerChatEnabled: null,
                    returnPolicy: null,
                    createdAt: new Date('2026-07-01T10:00:00.000Z'),
                    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
                },
            },
            {
                id: 'participant-2',
                battleId,
                productId: 'product-2',
                position: 2,
                voteCount: 0,
                isWinner: false,
                product: {
                    id: 'product-2',
                    closetId: 'closet-1',
                    userId: sellerId,
                    images: ['p2.jpg'],
                    name: 'Product B',
                    category: 'Fashion',
                    brand: 'Brand B',
                    condition: 'NEW',
                    description: null,
                    price: 95,
                    quantity: 3,
                    isActive: true,
                    isDeleted: false,
                    shippingOption: 'ship_items',
                    shippingFee: null,
                    estimateShippingTime: null,
                    pickupAddress: null,
                    pickupAvailableHours: null,
                    buyerChatEnabled: null,
                    returnPolicy: null,
                    createdAt: new Date('2026-07-01T10:00:00.000Z'),
                    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
                },
            },
        ];

        return base.map((participant, index) => ({
            ...participant,
            ...(overrides[index] || {}),
        }));
    };

    const makeCancelledBattle = (overrides: Record<string, any> = {}) => ({
        id: battleId,
        title: 'Cancelled Battle',
        description: 'desc',
        category: 'Fashion',
        status: MarketplaceBattleStatus.CANCELLED,
        outcome: MarketplaceBattleOutcome.CANCELLED,
        startAt: new Date('2026-07-06T09:00:00.000Z'),
        endAt: new Date('2026-07-06T11:00:00.000Z'),
        publishedAt: new Date('2026-07-06T08:59:00.000Z'),
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
                product: makeParticipants()[0].product,
            },
            {
                id: 'participant-2',
                position: 2,
                voteCount: 10,
                isWinner: false,
                product: makeParticipants()[1].product,
            },
        ],
        ...overrides,
    });

    const setupCancelSuccess = (
        status: MarketplaceBattleStatus,
        options: {
            source?: Record<string, any>;
            participants?: Array<Record<string, any>>;
            totalVotesByBattle?: number;
            groupedVotes?: Array<any>;
            totalComments?: number;
            cancelled?: Record<string, any>;
        } = {},
    ) => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeSourceBattle(status, options.source))
            .mockResolvedValueOnce(makeCancelledBattle(options.cancelled));

        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(
            makeParticipants(options.participants),
        );

        prisma.marketplaceBattleVote.count.mockResolvedValue(
            options.totalVotesByBattle ?? 25,
        );

        prisma.marketplaceBattleVote.groupBy.mockResolvedValue(
            options.groupedVotes ?? [
                { participantId: 'participant-1', _count: { _all: 15 } },
                { participantId: 'participant-2', _count: { _all: 10 } },
            ],
        );

        prisma.marketplaceBattleComment.count.mockResolvedValue(
            options.totalComments ?? 8,
        );

        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });
    };

    beforeEach(() => {
        prisma = {
            marketplaceBattle: {
                findUnique: jest.fn(),
                updateMany: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
            marketplaceBattleParticipant: {
                findMany: jest.fn(),
                updateMany: jest.fn(),
                createMany: jest.fn(),
                deleteMany: jest.fn(),
            },
            marketplaceBattleVote: {
                count: jest.fn(),
                groupBy: jest.fn(),
                deleteMany: jest.fn(),
            },
            marketplaceBattleComment: {
                count: jest.fn(),
                deleteMany: jest.fn(),
            },
            mycloset: {
                findUnique: jest.fn(),
            },
            battle: {
                updateMany: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (arg: any) => {
            if (typeof arg === 'function') return arg(prisma);
            if (Array.isArray(arg)) return Promise.all(arg);
            return arg;
        });

        notificationService = {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-cancel-1',
            }),
        };

        service = new MarketplaceBattlesService(prisma, notificationService);
    });

    it('1) Seller can cancel SCHEDULED battle', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.SCHEDULED);

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.message).toBe('Marketplace battle cancelled successfully');
    });

    it('2) Cancellation emits idempotent in-app notification', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.SCHEDULED);

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(notificationService.createInAppNotificationIfAbsent).toHaveBeenCalledWith(
            prisma,
            expect.objectContaining({
                userId: sellerId,
                type: 'marketplace_battle_cancelled',
                dedupeKey: `marketplace_battle_cancelled:${battleId}`,
            }),
        );
    });

    it('2) Seller can cancel LIVE battle', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.message).toBe('Marketplace battle cancelled successfully');
    });

    it('3) Another seller cannot cancel battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.LIVE),
        );

        await expect(
            service.cancelMarketplaceBattle(otherSellerId, battleId),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('4) DRAFT cancellation rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.DRAFT),
        );

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('5) COMPLETED cancellation rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.COMPLETED),
        );

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('6) CANCELLED cancellation rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.CANCELLED),
        );

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('7) status becomes CANCELLED', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.status).toBe(MarketplaceBattleStatus.CANCELLED);
    });

    it('8) outcome becomes CANCELLED', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.outcome).toBe(MarketplaceBattleOutcome.CANCELLED);
    });

    it('9) winnerParticipantId becomes null', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.winnerParticipantId).toBeNull();
    });

    it('10) completedAt remains/becomes null', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            source: { completedAt: new Date('2026-07-06T12:00:00.000Z') },
            cancelled: { completedAt: null },
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.completedAt).toBeNull();
    });

    it('11) startAt is preserved', async () => {
        const startAt = new Date('2026-07-06T09:00:00.000Z');
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            source: { startAt },
            cancelled: { startAt },
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.startAt).toEqual(startAt);
    });

    it('12) endAt is preserved', async () => {
        const endAt = new Date('2026-07-06T11:00:00.000Z');
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            source: { endAt },
            cancelled: { endAt },
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.endAt).toEqual(endAt);
    });

    it('13) publishedAt is preserved', async () => {
        const publishedAt = new Date('2026-07-06T08:59:00.000Z');
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            source: { publishedAt },
            cancelled: { publishedAt },
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.publishedAt).toEqual(publishedAt);
    });

    it('14) Votes are preserved', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattleVote.deleteMany).not.toHaveBeenCalled();
    });

    it('15) Comments are preserved', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattleComment.deleteMany).not.toHaveBeenCalled();
    });

    it('16) Participants are preserved', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattleParticipant.deleteMany).not.toHaveBeenCalled();
    });

    it('17) Valid authoritative votes are counted', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalVotesByBattle: 20,
            groupedVotes: [
                { participantId: 'participant-1', _count: { _all: 13 } },
                { participantId: 'participant-2', _count: { _all: 7 } },
            ],
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalVotes: 20,
                }),
            }),
        );
    });

    it('18) Mismatched battle/participant votes are excluded', async () => {
        const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalVotesByBattle: 12,
            groupedVotes: [
                { participantId: 'participant-1', _count: { _all: 4 } },
                { participantId: 'participant-2', _count: { _all: 5 } },
            ],
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(warnSpy).toHaveBeenCalled();
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalVotes: 9,
                }),
            }),
        );
    });

    it('19) Participant voteCount is reconciled', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            groupedVotes: [
                { participantId: 'participant-1', _count: { _all: 9 } },
                { participantId: 'participant-2', _count: { _all: 2 } },
            ],
            totalVotesByBattle: 11,
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ data: { voteCount: 9, isWinner: false } }),
        );
        expect(prisma.marketplaceBattleParticipant.updateMany).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ data: { voteCount: 2, isWinner: false } }),
        );
    });

    it('20) totalVotes is reconciled', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            groupedVotes: [
                { participantId: 'participant-1', _count: { _all: 6 } },
                { participantId: 'participant-2', _count: { _all: 1 } },
            ],
            totalVotesByBattle: 10,
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalVotes: 7,
                }),
            }),
        );
    });

    it('21) Non-deleted comments are counted', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalComments: 6,
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattleComment.count).toHaveBeenCalledWith({
            where: {
                battleId,
                deletedAt: null,
            },
        });
    });

    it('22) Soft-deleted comments are excluded', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalComments: 3,
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalComments: 3,
                }),
            }),
        );
    });

    it('23) totalComments is reconciled', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalComments: 11,
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalComments: 11,
                }),
            }),
        );
    });

    it('24) Existing stale isWinner values become false', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            participants: [{ isWinner: true }, { isWinner: true }],
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.participants.every((participant: any) => participant.isWinner === false)).toBe(true);
    });

    it('25) Invalid participant count causes rollback', async () => {
        const logSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.LIVE),
        );
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue([
            makeParticipants()[0],
        ]);

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(InternalServerErrorException);

        expect(logSpy).toHaveBeenCalled();
        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
    });

    it('26) Invalid participant positions cause rollback', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.LIVE),
        );
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(
            makeParticipants([{ position: 1 }, { position: 3 }]),
        );

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(InternalServerErrorException);

        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
    });

    it('27) Duplicate participant products cause rollback', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeSourceBattle(MarketplaceBattleStatus.LIVE),
        );
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(
            makeParticipants([{ productId: 'same' }, { productId: 'same' }]),
        );

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(InternalServerErrorException);

        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
    });

    it('28) Cancellation racing with lifecycle completion cannot overwrite COMPLETED result', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeSourceBattle(MarketplaceBattleStatus.LIVE))
            .mockResolvedValueOnce({ id: battleId, sellerId, status: MarketplaceBattleStatus.COMPLETED });
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(makeParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: 'participant-1', _count: { _all: 1 } },
            { participantId: 'participant-2', _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('29) Cancellation racing with voting remains counter-consistent', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalVotesByBattle: 9,
            groupedVotes: [
                { participantId: 'participant-1', _count: { _all: 5 } },
                { participantId: 'participant-2', _count: { _all: 4 } },
            ],
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.totalVotes).toBe(25);
        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalVotes: 9,
                }),
            }),
        );
    });

    it('30) Cancellation racing with comment creation remains counter-consistent', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            totalComments: 14,
        });

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    totalComments: 14,
                }),
            }),
        );
    });

    it('31) Two simultaneous cancellation attempts cannot both succeed', async () => {
        let status: MarketplaceBattleStatus = MarketplaceBattleStatus.LIVE;

        prisma.marketplaceBattle.findUnique.mockImplementation(async () => {
            if (status === MarketplaceBattleStatus.CANCELLED) {
                return { id: battleId, sellerId, status };
            }
            return makeSourceBattle(status);
        });

        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(makeParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: 'participant-1', _count: { _all: 1 } },
            { participantId: 'participant-2', _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(0);
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });

        prisma.marketplaceBattle.updateMany.mockImplementation(async () => {
            if (status === MarketplaceBattleStatus.LIVE) {
                status = MarketplaceBattleStatus.CANCELLED;
                return { count: 1 };
            }
            return { count: 0 };
        });

        const successBattle = makeCancelledBattle();
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeSourceBattle(MarketplaceBattleStatus.LIVE));
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(successBattle);
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeSourceBattle(MarketplaceBattleStatus.LIVE));
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce({ id: battleId, sellerId, status: MarketplaceBattleStatus.CANCELLED });

        const results = await Promise.allSettled([
            service.cancelMarketplaceBattle(sellerId, battleId),
            service.cancelMarketplaceBattle(sellerId, battleId),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    });

    it('32) Losing transaction cannot overwrite participant result fields', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeSourceBattle(MarketplaceBattleStatus.LIVE))
            .mockResolvedValueOnce({ id: battleId, sellerId, status: MarketplaceBattleStatus.COMPLETED });
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(makeParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(4);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: 'participant-1', _count: { _all: 3 } },
            { participantId: 'participant-2', _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(2);
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('33) Conditional transition failure rolls back participant changes', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeSourceBattle(MarketplaceBattleStatus.LIVE))
            .mockResolvedValueOnce({ id: battleId, sellerId, status: MarketplaceBattleStatus.CANCELLED });
        prisma.marketplaceBattleParticipant.findMany.mockResolvedValue(makeParticipants());
        prisma.marketplaceBattleVote.count.mockResolvedValue(2);
        prisma.marketplaceBattleVote.groupBy.mockResolvedValue([
            { participantId: 'participant-1', _count: { _all: 1 } },
            { participantId: 'participant-2', _count: { _all: 1 } },
        ]);
        prisma.marketplaceBattleComment.count.mockResolvedValue(1);
        prisma.marketplaceBattleParticipant.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.cancelMarketplaceBattle(sellerId, battleId),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('34) Explore excludes cancelled battle', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            {
                ...makeCancelledBattle(),
                seller: {
                    id: sellerId,
                    displayName: 'Seller',
                    userName: 'seller',
                    image: 'seller.jpg',
                },
                closet: {
                    id: 'closet-1',
                    shopName: 'Shop',
                    shopUsername: 'shop',
                    shopLogo: 'logo.jpg',
                },
                winnerParticipant: null,
            },
        ]);

        const result = await service.explorePublicBattles({} as any);

        expect(result.battles).toHaveLength(0);
    });

    it('35) Public details excludes cancelled battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            ...makeCancelledBattle(),
            seller: {
                id: sellerId,
                displayName: 'Seller',
                userName: 'seller',
                image: 'seller.jpg',
            },
            closet: {
                id: 'closet-1',
                shopName: 'Shop',
                shopUsername: 'shop',
                shopLogo: 'logo.jpg',
            },
            winnerParticipant: null,
        });

        await expect(service.getPublicBattleById(battleId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('36) Results excludes cancelled battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            {
                ...makeCancelledBattle(),
                sellerId,
                seller: {
                    id: sellerId,
                    displayName: 'Seller',
                    userName: 'seller',
                    image: 'seller.jpg',
                },
                closet: {
                    id: 'closet-1',
                    shopName: 'Shop',
                    shopUsername: 'shop',
                    shopLogo: 'logo.jpg',
                },
                participants: [
                    {
                        ...makeParticipants()[0],
                        product: {
                            id: 'product-1',
                            name: 'Product A',
                            images: ['a.jpg'],
                            price: 10,
                            category: 'Fashion',
                            brand: 'A',
                            condition: 'NEW',
                        },
                    },
                    {
                        ...makeParticipants()[1],
                        product: {
                            id: 'product-2',
                            name: 'Product B',
                            images: ['b.jpg'],
                            price: 20,
                            category: 'Fashion',
                            brand: 'B',
                            condition: 'NEW',
                        },
                    },
                ],
                winnerParticipant: null,
            } as any,
        );

        await expect(service.getMarketplaceBattleResults(battleId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('37) Winner Carousel excludes cancelled battles', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners('closet-1', {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: MarketplaceBattleStatus.COMPLETED,
                    outcome: MarketplaceBattleOutcome.WINNER,
                }),
            }),
        );
    });

    it('38) Seller management list can still show cancelled battle', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            {
                id: battleId,
                sellerId,
                closetId: 'closet-1',
                title: 'Cancelled Battle',
                description: null,
                category: null,
                status: MarketplaceBattleStatus.CANCELLED,
                outcome: MarketplaceBattleOutcome.CANCELLED,
                startAt: null,
                endAt: null,
                publishedAt: null,
                completedAt: null,
                winnerParticipantId: null,
                totalVotes: 0,
                totalComments: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                participants: [],
            },
        ]);

        const result = await service.listMyBattles(sellerId, {} as any);

        expect(result.battles[0].status).toBe(MarketplaceBattleStatus.CANCELLED);
    });

    it('39) Endpoint returns participants ordered by position ASC', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE, {
            cancelled: {
                participants: [
                    {
                        id: 'participant-2',
                        position: 2,
                        voteCount: 10,
                        isWinner: false,
                        product: makeParticipants()[1].product,
                    },
                    {
                        id: 'participant-1',
                        position: 1,
                        voteCount: 15,
                        isWinner: false,
                        product: makeParticipants()[0].product,
                    },
                ],
            },
        });

        const result = await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(result.battle.participants.map((participant: any) => participant.position)).toEqual([2, 1]);
        const secondFindUniqueArgs = prisma.marketplaceBattle.findUnique.mock.calls[1][0];
        expect(secondFindUniqueArgs.select.participants.orderBy).toEqual({ position: 'asc' });
    });

    it('40) Endpoint performs no hard deletes', async () => {
        setupCancelSuccess(MarketplaceBattleStatus.LIVE);

        await service.cancelMarketplaceBattle(sellerId, battleId);

        expect(prisma.marketplaceBattle.deleteMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattleParticipant.deleteMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattleVote.deleteMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattleComment.deleteMany).not.toHaveBeenCalled();
    });
});
