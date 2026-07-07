import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
    WhoCanBuy,
} from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 3)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;

    beforeEach(() => {
        prisma = {
            mycloset: {
                findUnique: jest.fn(),
            },
            closetItems: {
                findMany: jest.fn(),
            },
            marketplaceBattle: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                count: jest.fn(),
                updateMany: jest.fn(),
                deleteMany: jest.fn(),
            },
            marketplaceBattleParticipant: {
                createMany: jest.fn(),
                deleteMany: jest.fn(),
            },
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (arg: any) => {
            if (typeof arg === 'function') {
                return arg(prisma);
            }
            if (Array.isArray(arg)) {
                return Promise.all(arg);
            }
            return arg;
        });

        service = new MarketplaceBattlesService(prisma, {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-service-1',
            }),
        } as any);
    });

    it('1) seller lists only own battles', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([{ id: 'b1' }]);

        const result = await service.listMyBattles('seller-1', {} as any);

        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith({
            where: expect.objectContaining({ sellerId: 'seller-1' }),
        });
        expect(result.battles).toEqual([{ id: 'b1' }]);
    });

    it('2) pagination works', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(21);
        prisma.marketplaceBattle.findMany.mockResolvedValue([{ id: 'b1' }]);

        const result = await service.listMyBattles('seller-1', { page: 2, limit: 10 } as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 10,
                take: 10,
            }),
        );
        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(3);
    });

    it('3) status filter works', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.listMyBattles('seller-1', { status: MarketplaceBattleStatus.DRAFT } as any);

        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith({
            where: expect.objectContaining({ status: MarketplaceBattleStatus.DRAFT }),
        });
    });

    it('4) search works on title/description', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.listMyBattles('seller-1', { search: 'summer' } as any);

        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith({
            where: expect.objectContaining({
                OR: [
                    { title: { contains: 'summer', mode: 'insensitive' } },
                    { description: { contains: 'summer', mode: 'insensitive' } },
                ],
            }),
        });
    });

    it('5) invalid sort field safely falls back to default', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.listMyBattles('seller-1', { sortBy: 'bad_field', sortOrder: 'asc' } as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
        );
    });

    it('6) seller can view own battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            participants: [],
            winnerParticipant: null,
        });

        const result = await service.getMyBattleById('seller-1', 'b1');

        expect(result.id).toBe('b1');
    });

    it('7) seller cannot view another seller battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-2',
            participants: [],
            winnerParticipant: null,
        });

        await expect(service.getMyBattleById('seller-1', 'b1')).rejects.toBeInstanceOf(
            ForbiddenException,
        );
    });

    it('8) seller can update draft metadata', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                closetId: 'c1',
                status: MarketplaceBattleStatus.DRAFT,
                participants: [
                    { productId: '11111111-1111-4111-8111-111111111111' },
                    { productId: '22222222-2222-4222-8222-222222222222' },
                ],
            })
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                status: MarketplaceBattleStatus.DRAFT,
                participants: [],
                winnerParticipant: null,
            });

        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.updateDraftBattle('seller-1', 'b1', {
            title: 'New Title',
        });

        expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: 'b1',
                    sellerId: 'seller-1',
                    status: MarketplaceBattleStatus.DRAFT,
                },
            }),
        );
        expect(result.id).toBe('b1');
    });

    it('9) seller can replace products in draft', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                closetId: 'c1',
                status: MarketplaceBattleStatus.DRAFT,
                participants: [
                    { productId: '11111111-1111-4111-8111-111111111111' },
                    { productId: '22222222-2222-4222-8222-222222222222' },
                ],
            })
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                status: MarketplaceBattleStatus.DRAFT,
                participants: [],
                winnerParticipant: null,
            });

        prisma.closetItems.findMany.mockResolvedValue([
            {
                id: '33333333-3333-4333-8333-333333333333',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
            {
                id: '44444444-4444-4444-8444-444444444444',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.deleteMany.mockResolvedValue({ count: 2 });
        prisma.marketplaceBattleParticipant.createMany.mockResolvedValue({ count: 2 });

        await service.updateDraftBattle('seller-1', 'b1', {
            productIds: [
                '33333333-3333-4333-8333-333333333333',
                '44444444-4444-4444-8444-444444444444',
            ],
        });

        expect(prisma.marketplaceBattleParticipant.deleteMany).toHaveBeenCalledWith({
            where: { battleId: 'b1' },
        });
        expect(prisma.marketplaceBattleParticipant.createMany).toHaveBeenCalled();
    });

    it('10) same product twice is rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            closetId: 'c1',
            status: MarketplaceBattleStatus.DRAFT,
            participants: [
                { productId: '11111111-1111-4111-8111-111111111111' },
                { productId: '22222222-2222-4222-8222-222222222222' },
            ],
        });

        await expect(
            service.updateDraftBattle('seller-1', 'b1', {
                productIds: [
                    '33333333-3333-4333-8333-333333333333',
                    '33333333-3333-4333-8333-333333333333',
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("11) another seller's product is rejected", async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            closetId: 'c1',
            status: MarketplaceBattleStatus.DRAFT,
            participants: [
                { productId: '11111111-1111-4111-8111-111111111111' },
                { productId: '22222222-2222-4222-8222-222222222222' },
            ],
        });

        prisma.closetItems.findMany.mockResolvedValue([
            {
                id: '33333333-3333-4333-8333-333333333333',
                userId: 'seller-2',
                closetId: 'c2',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
            {
                id: '44444444-4444-4444-8444-444444444444',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        await expect(
            service.updateDraftBattle('seller-1', 'b1', {
                productIds: [
                    '33333333-3333-4333-8333-333333333333',
                    '44444444-4444-4444-8444-444444444444',
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('12) updating non-draft battle is rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            closetId: 'c1',
            status: MarketplaceBattleStatus.LIVE,
            participants: [],
        });

        await expect(
            service.updateDraftBattle('seller-1', 'b1', { title: 'Nope' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('13) seller can delete draft battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            status: MarketplaceBattleStatus.DRAFT,
        });
        prisma.marketplaceBattle.deleteMany.mockResolvedValue({ count: 1 });

        const result = await service.deleteDraftBattle('seller-1', 'b1');

        expect(result).toEqual({
            message: 'Marketplace battle deleted successfully',
            battleId: 'b1',
        });
    });

    it('14) deleting non-draft battle is rejected', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            status: MarketplaceBattleStatus.COMPLETED,
        });

        await expect(service.deleteDraftBattle('seller-1', 'b1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('15) participant replacement failure rolls back full update', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                closetId: 'c1',
                status: MarketplaceBattleStatus.DRAFT,
                participants: [
                    { productId: '11111111-1111-4111-8111-111111111111' },
                    { productId: '22222222-2222-4222-8222-222222222222' },
                ],
            });

        prisma.closetItems.findMany.mockResolvedValue([
            {
                id: '33333333-3333-4333-8333-333333333333',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
            {
                id: '44444444-4444-4444-8444-444444444444',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });
        prisma.marketplaceBattleParticipant.deleteMany.mockResolvedValue({ count: 2 });
        prisma.marketplaceBattleParticipant.createMany.mockRejectedValue(new Error('create failed'));

        await expect(
            service.updateDraftBattle('seller-1', 'b1', {
                productIds: [
                    '33333333-3333-4333-8333-333333333333',
                    '44444444-4444-4444-8444-444444444444',
                ],
            }),
        ).rejects.toThrow('create failed');

        expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('16) concurrent publish/update prevents non-draft write', async () => {
        prisma.marketplaceBattle.findUnique
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                closetId: 'c1',
                status: MarketplaceBattleStatus.DRAFT,
                participants: [],
            })
            .mockResolvedValueOnce({
                id: 'b1',
                sellerId: 'seller-1',
                status: MarketplaceBattleStatus.LIVE,
            });

        prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.updateDraftBattle('seller-1', 'b1', { title: 'new' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create draft sets immutable lifecycle defaults', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'c1' });
        prisma.closetItems.findMany.mockResolvedValue([
            {
                id: '11111111-1111-4111-8111-111111111111',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
            {
                id: '22222222-2222-4222-8222-222222222222',
                userId: 'seller-1',
                closetId: 'c1',
                isActive: true,
                isDeleted: false,
                quantity: 1,
            },
        ]);

        prisma.marketplaceBattle.create.mockResolvedValue({ id: 'b1' });
        prisma.marketplaceBattleParticipant.createMany.mockResolvedValue({ count: 2 });
        prisma.marketplaceBattle.findUnique.mockResolvedValue({
            id: 'b1',
            sellerId: 'seller-1',
            closetId: 'c1',
            status: MarketplaceBattleStatus.LIVE,
            outcome: MarketplaceBattleOutcome.PENDING,
            participants: [],
        });

        const fixedNow = new Date('2026-07-06T10:00:00.000Z');
        jest.useFakeTimers();
        jest.setSystemTime(fixedNow);

        await service.createDraftBattle('seller-1', {
            title: 't',
            description: 'd',
            category: 'Fashion',
            visibility: WhoCanBuy.followers,
            whoCanVote: WhoCanBuy.followers,
            shareToFeed: true,
            productIds: [
                '11111111-1111-4111-8111-111111111111',
                '22222222-2222-4222-8222-222222222222',
            ],
            endAt: '2026-07-06T12:00:00.000Z',
        });

        jest.useRealTimers();

        expect(prisma.marketplaceBattle.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    sellerId: 'seller-1',
                    closetId: 'c1',
                    visibility: WhoCanBuy.followers,
                    whoCanVote: WhoCanBuy.followers,
                    shareToFeed: true,
                    status: MarketplaceBattleStatus.LIVE,
                    outcome: MarketplaceBattleOutcome.PENDING,
                    publishedAt: fixedNow,
                    totalVotes: 0,
                    totalComments: 0,
                }),
            }),
        );
    });

    it('returns not found when battle does not exist for details endpoint', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(null);

        await expect(service.getMyBattleById('seller-1', 'missing')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    describe('publishDraftBattle (Step 4)', () => {
        const sellerId = 'seller-1';
        const battleId = 'battle-1';
        const closetId = 'closet-1';
        const productAId = 'product-A';
        const productBId = 'product-B';

        const fixedNow = new Date('2026-07-06T10:00:00.000Z');

        const buildInitialBattle = (overrides: Record<string, any> = {}) => ({
            id: battleId,
            sellerId,
            closetId,
            status: MarketplaceBattleStatus.DRAFT,
            title: 'Battle Title',
            participants: [
                { id: 'p1', productId: productAId, position: 1 },
                { id: 'p2', productId: productBId, position: 2 },
            ],
            ...overrides,
        });

        const buildProducts = (overrides: Array<Record<string, any>> = []) => {
            const defaults = [
                {
                    id: productAId,
                    userId: sellerId,
                    closetId,
                    isActive: true,
                    isDeleted: false,
                    quantity: 1,
                },
                {
                    id: productBId,
                    userId: sellerId,
                    closetId,
                    isActive: true,
                    isDeleted: false,
                    quantity: 1,
                },
            ];

            return defaults.map((item, index) => ({
                ...item,
                ...(overrides[index] || {}),
            }));
        };

        const buildPublishedBattle = (overrides: Record<string, any> = {}) => ({
            id: battleId,
            sellerId,
            closetId,
            title: 'Battle Title',
            description: 'Desc',
            category: 'Fashion',
            status: MarketplaceBattleStatus.LIVE,
            outcome: MarketplaceBattleOutcome.PENDING,
            startAt: fixedNow,
            endAt: new Date('2026-07-06T12:00:00.000Z'),
            publishedAt: fixedNow,
            completedAt: null,
            winnerParticipantId: null,
            totalVotes: 0,
            totalComments: 0,
            createdAt: new Date('2026-07-06T08:00:00.000Z'),
            updatedAt: new Date('2026-07-06T10:00:00.000Z'),
            participants: [
                {
                    id: 'p1',
                    battleId,
                    productId: productAId,
                    position: 1,
                    voteCount: 0,
                    isWinner: false,
                    createdAt: fixedNow,
                    updatedAt: fixedNow,
                    product: {
                        id: productAId,
                        closetId,
                        userId: sellerId,
                        images: [],
                        name: 'A',
                        category: 'Fashion',
                        brand: null,
                        condition: 'New',
                        description: null,
                        price: 10,
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
                        createdAt: fixedNow,
                        updatedAt: fixedNow,
                    },
                },
                {
                    id: 'p2',
                    battleId,
                    productId: productBId,
                    position: 2,
                    voteCount: 0,
                    isWinner: false,
                    createdAt: fixedNow,
                    updatedAt: fixedNow,
                    product: {
                        id: productBId,
                        closetId,
                        userId: sellerId,
                        images: [],
                        name: 'B',
                        category: 'Fashion',
                        brand: null,
                        condition: 'New',
                        description: null,
                        price: 12,
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
                        createdAt: fixedNow,
                        updatedAt: fixedNow,
                    },
                },
            ],
            winnerParticipant: null,
            ...overrides,
        });

        const setupPublishSuccess = (
            options: {
                initialBattle?: Record<string, any>;
                products?: Array<Record<string, any>>;
                publishedBattle?: Record<string, any>;
            } = {},
        ) => {
            prisma.marketplaceBattle.findUnique
                .mockResolvedValueOnce(buildInitialBattle(options.initialBattle))
                .mockResolvedValueOnce(buildPublishedBattle(options.publishedBattle));

            prisma.closetItems.findMany.mockResolvedValue(buildProducts(options.products));
            prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 1 });
        };

        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(fixedNow);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('1) DRAFT battle with omitted startAt publishes as LIVE', async () => {
            setupPublishSuccess();

            const result = await service.publishDraftBattle(sellerId, battleId, {
                endAt: '2026-07-06T12:00:00.000Z',
            });

            expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: MarketplaceBattleStatus.LIVE,
                        startAt: fixedNow,
                        publishedAt: fixedNow,
                    }),
                }),
            );
            expect(result.status).toBe(MarketplaceBattleStatus.LIVE);
        });

        it('2) DRAFT battle with future startAt publishes as SCHEDULED', async () => {
            setupPublishSuccess({
                publishedBattle: { status: MarketplaceBattleStatus.SCHEDULED },
            });

            const result = await service.publishDraftBattle(sellerId, battleId, {
                startAt: '2026-07-06T11:00:00.000Z',
                endAt: '2026-07-06T12:00:00.000Z',
            });

            expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: MarketplaceBattleStatus.SCHEDULED,
                    }),
                }),
            );
            expect(result.status).toBe(MarketplaceBattleStatus.SCHEDULED);
        });

        it('3) endAt <= startAt is rejected', async () => {
            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    startAt: '2026-07-06T11:00:00.000Z',
                    endAt: '2026-07-06T10:59:59.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('4) endAt equal to startAt is rejected', async () => {
            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    startAt: '2026-07-06T11:00:00.000Z',
                    endAt: '2026-07-06T11:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('5) explicit startAt significantly in the past is rejected', async () => {
            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    startAt: '2026-07-06T09:58:59.000Z',
                    endAt: '2026-07-06T11:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('6) explicit startAt within configured tolerance is accepted', async () => {
            setupPublishSuccess();

            const result = await service.publishDraftBattle(sellerId, battleId, {
                startAt: '2026-07-06T09:59:30.000Z',
                endAt: '2026-07-06T12:00:00.000Z',
            });

            expect(result.status).toBe(MarketplaceBattleStatus.LIVE);
            expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: MarketplaceBattleStatus.LIVE }),
                }),
            );
        });

        it('7) another seller cannot publish the battle', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
                buildInitialBattle({ sellerId: 'seller-2' }),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('8) non-DRAFT battle cannot be published', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
                buildInitialBattle({ status: MarketplaceBattleStatus.LIVE }),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('9) battle with fewer than two participants is rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
                buildInitialBattle({ participants: [{ id: 'p1', productId: productAId, position: 1 }] }),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('10) battle with more than two participants is rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
                buildInitialBattle({
                    participants: [
                        { id: 'p1', productId: productAId, position: 1 },
                        { id: 'p2', productId: productBId, position: 2 },
                        { id: 'p3', productId: 'product-C', position: 3 },
                    ],
                }),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('11) invalid participant positions are rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
                buildInitialBattle({
                    participants: [
                        { id: 'p1', productId: productAId, position: 1 },
                        { id: 'p2', productId: productBId, position: 3 },
                    ],
                }),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('12) duplicate participant products are rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(
                buildInitialBattle({
                    participants: [
                        { id: 'p1', productId: productAId, position: 1 },
                        { id: 'p2', productId: productAId, position: 2 },
                    ],
                }),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('13) deleted/inactive/unavailable product is rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(buildInitialBattle());
            prisma.closetItems.findMany.mockResolvedValue(
                buildProducts([{ isActive: false }, {}]),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('14) product belonging to another seller is rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(buildInitialBattle());
            prisma.closetItems.findMany.mockResolvedValue(
                buildProducts([{ userId: 'seller-2' }, {}]),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('15) product belonging to another Closet is rejected', async () => {
            prisma.marketplaceBattle.findUnique.mockResolvedValueOnce(buildInitialBattle());
            prisma.closetItems.findMany.mockResolvedValue(
                buildProducts([{ closetId: 'closet-2' }, {}]),
            );

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('16) two simultaneous publish attempts cannot both succeed', async () => {
            let status: MarketplaceBattleStatus = MarketplaceBattleStatus.DRAFT;

            prisma.marketplaceBattle.findUnique.mockImplementation(async (args: any) => {
                const hasParticipants = Boolean(args?.select?.participants);
                const hasOutcome = Boolean(args?.select?.outcome);

                if (hasParticipants && !hasOutcome) {
                    return {
                        id: battleId,
                        sellerId,
                        closetId,
                        status,
                        title: 'Battle Title',
                        participants: [
                            { id: 'p1', productId: productAId, position: 1 },
                            { id: 'p2', productId: productBId, position: 2 },
                        ],
                    };
                }

                if (!hasParticipants && !hasOutcome) {
                    return status
                        ? { id: battleId, sellerId, status }
                        : null;
                }

                return buildPublishedBattle({ status });
            });

            prisma.closetItems.findMany.mockResolvedValue(buildProducts());
            prisma.marketplaceBattle.updateMany.mockImplementation(async () => {
                if (status === MarketplaceBattleStatus.DRAFT) {
                    status = MarketplaceBattleStatus.LIVE;
                    return { count: 1 };
                }
                return { count: 0 };
            });

            const results = await Promise.allSettled([
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ]);

            const fulfilled = results.filter((result) => result.status === 'fulfilled');
            const rejected = results.filter((result) => result.status === 'rejected');

            expect(fulfilled).toHaveLength(1);
            expect(rejected).toHaveLength(1);
        });

        it('17) publish loses race against PATCH status change and does not overwrite newer status', async () => {
            prisma.marketplaceBattle.findUnique
                .mockResolvedValueOnce(buildInitialBattle())
                .mockResolvedValueOnce({
                    id: battleId,
                    sellerId,
                    status: MarketplaceBattleStatus.LIVE,
                });
            prisma.closetItems.findMany.mockResolvedValue(buildProducts());
            prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('18) publish loses race against DELETE and does not recreate or publish', async () => {
            prisma.marketplaceBattle.findUnique
                .mockResolvedValueOnce(buildInitialBattle())
                .mockResolvedValueOnce(null);
            prisma.closetItems.findMany.mockResolvedValue(buildProducts());
            prisma.marketplaceBattle.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                service.publishDraftBattle(sellerId, battleId, {
                    endAt: '2026-07-06T12:00:00.000Z',
                }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('19) outcome remains PENDING', async () => {
            setupPublishSuccess({
                publishedBattle: { outcome: MarketplaceBattleOutcome.PENDING },
            });

            const result = await service.publishDraftBattle(sellerId, battleId, {
                endAt: '2026-07-06T12:00:00.000Z',
            });

            expect(result.outcome).toBe(MarketplaceBattleOutcome.PENDING);
            expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.not.objectContaining({ outcome: expect.anything() }),
                }),
            );
        });

        it('20) counters and winner fields remain unchanged', async () => {
            setupPublishSuccess({
                publishedBattle: {
                    totalVotes: 9,
                    totalComments: 3,
                    winnerParticipantId: 'winner-1',
                },
            });

            const result = await service.publishDraftBattle(sellerId, battleId, {
                endAt: '2026-07-06T12:00:00.000Z',
            });

            expect(result.totalVotes).toBe(9);
            expect(result.totalComments).toBe(3);
            expect(result.winnerParticipantId).toBe('winner-1');
            expect(prisma.marketplaceBattle.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.not.objectContaining({
                        totalVotes: expect.anything(),
                        totalComments: expect.anything(),
                        winnerParticipantId: expect.anything(),
                    }),
                }),
            );
        });

        it('21) response participants are ordered by position ASC', async () => {
            setupPublishSuccess({
                publishedBattle: {
                    participants: [
                        {
                            ...buildPublishedBattle().participants[0],
                            position: 1,
                        },
                        {
                            ...buildPublishedBattle().participants[1],
                            position: 2,
                        },
                    ],
                },
            });

            const result = await service.publishDraftBattle(sellerId, battleId, {
                endAt: '2026-07-06T12:00:00.000Z',
            });

            expect(result.participants.map((participant: any) => participant.position)).toEqual([1, 2]);
        });
    });
});
