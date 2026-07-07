import {
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
} from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 11 Challenge)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;
    let notificationService: any;

    const sourceBattleId = 'battle-source-1';
    const sellerId = 'seller-1';
    const otherSellerId = 'seller-2';
    const closetId = 'closet-1';
    const winnerParticipantId = 'participant-1';
    const winnerProductId = 'product-1';
    const challengerProductId = 'product-2';

    const makeCompletedWinnerBattle = (overrides: Record<string, any> = {}) => ({
        id: sourceBattleId,
        sellerId,
        closetId,
        title: 'Summer Style Battle',
        category: 'Fashion',
        status: MarketplaceBattleStatus.COMPLETED,
        outcome: MarketplaceBattleOutcome.WINNER,
        startAt: new Date('2026-07-05T10:00:00.000Z'),
        endAt: new Date('2026-07-06T10:00:00.000Z'),
        completedAt: new Date('2026-07-06T10:00:01.000Z'),
        winnerParticipantId,
        totalVotes: 100,
        totalComments: 25,
        participants: [
            {
                id: winnerParticipantId,
                battleId: sourceBattleId,
                productId: winnerProductId,
                position: 1,
                voteCount: 60,
                isWinner: true,
                product: {
                    id: winnerProductId,
                    name: 'Previous Winner',
                    images: ['p1.jpg'],
                    price: 100,
                    category: 'Fashion',
                    brand: 'A',
                    condition: 'NEW',
                },
            },
            {
                id: 'participant-2',
                battleId: sourceBattleId,
                productId: 'product-9',
                position: 2,
                voteCount: 40,
                isWinner: false,
                product: {
                    id: 'product-9',
                    name: 'Loser Product',
                    images: ['p9.jpg'],
                    price: 90,
                    category: 'Fashion',
                    brand: 'B',
                    condition: 'NEW',
                },
            },
        ],
        winnerParticipant: {
            id: winnerParticipantId,
            battleId: sourceBattleId,
            product: {
                id: winnerProductId,
                name: 'Previous Winner',
                images: ['p1.jpg'],
                price: 100,
                category: 'Fashion',
                brand: 'A',
                condition: 'NEW',
            },
        },
        ...overrides,
    });

    const makeCreatedChallengeBattle = (overrides: Record<string, any> = {}) => ({
        id: 'battle-new-1',
        title: 'Can the Champion Win Again?',
        description: 'The previous winner faces another product',
        category: 'Fashion',
        status: MarketplaceBattleStatus.DRAFT,
        outcome: MarketplaceBattleOutcome.PENDING,
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
                    id: winnerProductId,
                    name: 'Previous Winner',
                },
            },
            {
                position: 2,
                voteCount: 0,
                isWinner: false,
                product: {
                    id: challengerProductId,
                    name: 'New Challenger',
                },
            },
        ],
        ...overrides,
    });

    const mockEligibleProducts = () => {
        prisma.closetItems.findMany
            .mockResolvedValueOnce([
                {
                    id: winnerProductId,
                    userId: sellerId,
                    closetId,
                    isActive: true,
                    isDeleted: false,
                    quantity: 2,
                },
                {
                    id: challengerProductId,
                    userId: sellerId,
                    closetId,
                    isActive: true,
                    isDeleted: false,
                    quantity: 1,
                },
            ])
            .mockResolvedValueOnce([
                { id: winnerProductId, name: 'Previous Winner' },
                { id: challengerProductId, name: 'New Challenger' },
            ]);
    };

    const setupSuccess = (opts: { source?: Record<string, any>; created?: Record<string, any> } = {}) => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce(makeCompletedWinnerBattle(opts.source))
            .mockResolvedValueOnce(makeCreatedChallengeBattle(opts.created));
        mockEligibleProducts();
        prisma.marketplaceBattle.create.mockResolvedValue({ id: 'battle-new-1' });
        prisma.marketplaceBattleParticipant.createMany.mockResolvedValue({ count: 2 });
    };

    beforeEach(() => {
        prisma = {
            marketplaceBattle: {
                findUnique: jest.fn(),
                create: jest.fn(),
                updateMany: jest.fn(),
                deleteMany: jest.fn(),
            },
            marketplaceBattleParticipant: {
                createMany: jest.fn(),
            },
            closetItems: {
                findMany: jest.fn(),
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
                notificationId: 'notif-1',
            }),
        };

        service = new MarketplaceBattlesService(prisma, notificationService);
    });

    it('1) Seller creates challenge from completed WINNER battle', async () => {
        setupSuccess();

        const result = await service.createChallengeBattle(sellerId, sourceBattleId, {
            challengerProductId,
            title: 'Can the Champion Win Again?',
            description: 'The previous winner faces another product',
            category: 'Fashion',
        } as any);

        expect(result.message).toBe('Marketplace challenge battle created successfully');
        expect(result.sourceBattle.id).toBe(sourceBattleId);
    });

    it('2) Challenge creation emits idempotent in-app notification', async () => {
        setupSuccess();

        await service.createChallengeBattle(sellerId, sourceBattleId, {
            challengerProductId,
        } as any);

        expect(notificationService.createInAppNotificationIfAbsent).toHaveBeenCalledWith(
            prisma,
            expect.objectContaining({
                userId: sellerId,
                type: 'marketplace_battle_challenge_created',
                dedupeKey: 'marketplace_battle_challenge_created:battle-new-1',
            }),
        );
    });

    it('2) New battle status is DRAFT', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.status).toBe(MarketplaceBattleStatus.DRAFT);
    });

    it('3) New battle outcome is PENDING', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.outcome).toBe(MarketplaceBattleOutcome.PENDING);
    });

    it('4) New battle counters are zero', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.totalVotes).toBe(0);
        expect(result.battle.totalComments).toBe(0);
    });

    it('5) New battle lifecycle timestamps are null', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.startAt).toBeNull();
        expect(result.battle.endAt).toBeNull();
        expect(result.battle.publishedAt).toBeNull();
        expect(result.battle.completedAt).toBeNull();
    });

    it('6) Position 1 is previous winning product', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.participants[0].position).toBe(1);
        expect(result.battle.participants[0].product.id).toBe(winnerProductId);
    });

    it('7) Position 2 is challenger product', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.participants[1].position).toBe(2);
        expect(result.battle.participants[1].product.id).toBe(challengerProductId);
    });

    it('8) Both new participants have voteCount zero', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.participants[0].voteCount).toBe(0);
        expect(result.battle.participants[1].voteCount).toBe(0);
    });

    it('9) Both new participants have isWinner false', async () => {
        setupSuccess();
        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);
        expect(result.battle.participants[0].isWinner).toBe(false);
        expect(result.battle.participants[1].isWinner).toBe(false);
    });

    it('10) Original battle remains unchanged', async () => {
        setupSuccess();
        await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.deleteMany).not.toHaveBeenCalled();
    });

    it('11) Another seller cannot challenge original battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());

        await expect(
            service.createChallengeBattle(otherSellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('12) DRAFT original battle rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ status: MarketplaceBattleStatus.DRAFT }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('13) SCHEDULED original battle rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ status: MarketplaceBattleStatus.SCHEDULED }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('14) LIVE original battle rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ status: MarketplaceBattleStatus.LIVE }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('15) CANCELLED original battle rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ status: MarketplaceBattleStatus.CANCELLED }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('16) TIE completed battle rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ outcome: MarketplaceBattleOutcome.TIE, winnerParticipantId: null }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('17) PENDING outcome rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ outcome: MarketplaceBattleOutcome.PENDING }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('18) Missing winnerParticipantId rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ winnerParticipantId: null }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('19) Missing completedAt rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ completedAt: null }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('20) Completed-result integrity failure rejects challenge', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ participants: [makeCompletedWinnerBattle().participants[0]] }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('21) Challenger equal to winning product rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, {
                challengerProductId: winnerProductId,
            } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('22) Challenger product does not exist', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 2,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('23) Challenger belongs to another seller rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 2,
            },
            {
                id: challengerProductId,
                userId: 'seller-99',
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('24) Challenger belongs to another Closet rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 2,
            },
            {
                id: challengerProductId,
                userId: sellerId,
                closetId: 'other-closet',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('25) Inactive challenger rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 2,
            },
            {
                id: challengerProductId,
                userId: sellerId,
                closetId,
                isActive: false,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('26) Deleted challenger rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 2,
            },
            {
                id: challengerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: true,
                quantity: 1,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('27) Zero-quantity challenger rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 2,
            },
            {
                id: challengerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 0,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('28) Inactive/deleted/unavailable winner product rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        prisma.closetItems.findMany.mockResolvedValueOnce([
            {
                id: winnerProductId,
                userId: sellerId,
                closetId,
                isActive: false,
                isDeleted: false,
                quantity: 2,
            },
            {
                id: challengerProductId,
                userId: sellerId,
                closetId,
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('29) Custom title is trimmed', async () => {
        setupSuccess();

        await service.createChallengeBattle(sellerId, sourceBattleId, {
            challengerProductId,
            title: '   Trimmed Title   ',
        } as any);

        expect(prisma.marketplaceBattle.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: 'Trimmed Title',
                }),
            }),
        );
    });

    it('30) Empty custom title rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        mockEligibleProducts();

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, {
                challengerProductId,
                title: '    ',
            } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('31) Default title is generated correctly', async () => {
        setupSuccess();

        await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect(prisma.marketplaceBattle.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: 'Previous Winner vs New Challenger',
                }),
            }),
        );
    });

    it('32) Category falls back to original battle category', async () => {
        setupSuccess({ source: { category: 'Shoes' } });

        await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect(prisma.marketplaceBattle.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    category: 'Shoes',
                }),
            }),
        );
    });

    it('33) Battle and participant creation are atomic', async () => {
        setupSuccess();
        await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.marketplaceBattle.create).toHaveBeenCalled();
        expect(prisma.marketplaceBattleParticipant.createMany).toHaveBeenCalled();
    });

    it('34) Participant creation failure rolls back new battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(makeCompletedWinnerBattle());
        mockEligibleProducts();
        prisma.marketplaceBattle.create.mockResolvedValue({ id: 'battle-new-1' });
        prisma.marketplaceBattleParticipant.createMany.mockRejectedValue(new Error('create-many-failed'));

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toThrow('create-many-failed');

        expect(prisma.marketplaceBattle.findUnique).toHaveBeenCalledTimes(1);
    });

    it('35) Original battle is revalidated inside transaction', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
            makeCompletedWinnerBattle({ status: MarketplaceBattleStatus.LIVE }),
        );

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('36) Response participants ordered by position ASC', async () => {
        setupSuccess();

        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect(result.battle.participants.map((participant: any) => participant.position)).toEqual([1, 2]);
        const secondFindUniqueArgs = prisma.marketplaceBattle.findUnique.mock.calls[1][0];
        expect(secondFindUniqueArgs.select.participants.orderBy).toEqual({ position: 'asc' });
    });

    it('37) No vote/comment collections are returned', async () => {
        setupSuccess();

        const result = await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect((result.battle as any).votes).toBeUndefined();
        expect((result.battle as any).comments).toBeUndefined();
        expect((result.sourceBattle as any).votes).toBeUndefined();
        expect((result.sourceBattle as any).comments).toBeUndefined();
    });

    it('38) Existing regular social Battle system is unaffected', async () => {
        setupSuccess();

        await service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any);

        expect(prisma.battle.create).not.toHaveBeenCalled();
        expect(prisma.battle.updateMany).not.toHaveBeenCalled();
        expect(prisma.battle.deleteMany).not.toHaveBeenCalled();
    });

    it('returns NotFound when source battle is missing', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(null);

        await expect(
            service.createChallengeBattle(sellerId, sourceBattleId, { challengerProductId } as any),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
