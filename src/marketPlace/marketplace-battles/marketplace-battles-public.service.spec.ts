import { NotFoundException } from '@nestjs/common';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
} from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 6 Public APIs)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;

    const now = new Date('2026-07-06T10:00:00.000Z');

    const makeBattle = (
        status: MarketplaceBattleStatus,
        overrides: Record<string, any> = {},
    ) => ({
        id: 'battle-1',
        title: 'Summer Battle',
        description: 'desc',
        category: 'Fashion',
        status,
        outcome: MarketplaceBattleOutcome.PENDING,
        startAt: new Date('2026-07-06T09:00:00.000Z'),
        endAt: new Date('2026-07-06T11:00:00.000Z'),
        publishedAt: new Date('2026-07-06T09:00:00.000Z'),
        completedAt: null,
        winnerParticipantId: null,
        totalVotes: 10,
        totalComments: 2,
        createdAt: new Date('2026-07-06T08:00:00.000Z'),
        updatedAt: new Date('2026-07-06T09:30:00.000Z'),
        seller: {
            id: 'seller-1',
            displayName: 'Seller Name',
            userName: 'seller_username',
            image: 'seller.jpg',
        },
        closet: {
            id: 'closet-1',
            shopName: 'My Shop',
            shopUsername: 'myshop',
            shopLogo: 'logo.jpg',
        },
        participants: [
            {
                id: 'p1',
                position: 1,
                voteCount: 6,
                isWinner: false,
                product: {
                    id: 'prod-1',
                    name: 'Prod 1',
                    images: ['a.jpg'],
                    price: 10,
                    quantity: 5,
                    category: 'Fashion',
                    brand: 'A',
                    condition: 'New',
                    isActive: true,
                    isDeleted: false,
                },
            },
            {
                id: 'p2',
                position: 2,
                voteCount: 4,
                isWinner: false,
                product: {
                    id: 'prod-2',
                    name: 'Prod 2',
                    images: ['b.jpg'],
                    price: 20,
                    quantity: 3,
                    category: 'Fashion',
                    brand: 'B',
                    condition: 'Used',
                    isActive: true,
                    isDeleted: false,
                },
            },
        ],
        winnerParticipant: null,
        ...overrides,
    });

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(now);

        prisma = {
            marketplaceBattle: {
                count: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
            mycloset: {
                findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
        };

        prisma.$transaction.mockImplementation(async (arg: any) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            if (typeof arg === 'function') return arg(prisma);
            return arg;
        });

        service = new MarketplaceBattlesService(prisma, {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-public-1',
            }),
        } as any);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('1) Explore returns only LIVE battles', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.LIVE)]);

        const result = await service.explorePublicBattles({} as any);
        expect(result.battles.every((battle: any) => battle.status === 'LIVE')).toBe(true);
    });

    it('2) Explore excludes DRAFT', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.DRAFT)]);

        const result = await service.explorePublicBattles({} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('3) Explore excludes SCHEDULED', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.SCHEDULED)]);

        const result = await service.explorePublicBattles({} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('4) Explore query is constrained to LIVE status only', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.explorePublicBattles({} as any);
        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: MarketplaceBattleStatus.LIVE,
                }),
            }),
        );
    });

    it('5) Explore excludes CANCELLED', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.CANCELLED)]);

        const result = await service.explorePublicBattles({} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('6) Explore excludes stale expired LIVE battle', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            makeBattle(MarketplaceBattleStatus.LIVE, {
                endAt: new Date('2026-07-06T09:59:00.000Z'),
            }),
        ]);

        const result = await service.explorePublicBattles({} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('7) Explore excludes LIVE battle whose startAt is still future', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            makeBattle(MarketplaceBattleStatus.LIVE, {
                startAt: new Date('2026-07-06T10:01:00.000Z'),
            }),
        ]);

        const result = await service.explorePublicBattles({} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('8) Explore pagination works', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(20);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.LIVE)]);

        const result = await service.explorePublicBattles({ page: 2, limit: 10 } as any);
        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(2);
        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 10, take: 10 }),
        );
    });

    it('9) Explore category filter works', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.explorePublicBattles({ category: 'Fashion' } as any);
        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    category: { equals: 'Fashion', mode: 'insensitive' },
                }),
            }),
        );
    });

    it('10) Explore search works', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.explorePublicBattles({ search: 'summer' } as any);
        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: [
                        { title: { contains: 'summer', mode: 'insensitive' } },
                        { description: { contains: 'summer', mode: 'insensitive' } },
                    ],
                }),
            }),
        );
    });

    it('11) Explore sort whitelist works', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.explorePublicBattles({ sortBy: 'endAt', sortOrder: 'asc' } as any);
        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { endAt: 'asc' } }),
        );
    });

    it('12) Invalid sort input is safely defaulted', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(0);
        prisma.marketplaceBattle.findMany.mockResolvedValue([]);

        await service.explorePublicBattles({ sortBy: 'invalid', sortOrder: 'asc' } as any);
        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { publishedAt: 'asc' } }),
        );
    });

    it('13) Closet endpoint returns only battles belonging to requested Closet', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.LIVE)]);

        await service.getClosetPublicBattles('closet-1', {} as any);
        expect(prisma.marketplaceBattle.count).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ closetId: 'closet-1' }) }),
        );
    });

    it('14) Closet endpoint rejects missing Closet', async () => {
        prisma.mycloset.findUnique.mockResolvedValue(null);

        await expect(service.getClosetPublicBattles('missing', {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('15) Closet endpoint never exposes DRAFT', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.DRAFT)]);

        const result = await service.getClosetPublicBattles('closet-1', {} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('16) Closet endpoint never exposes CANCELLED', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.CANCELLED)]);

        const result = await service.getClosetPublicBattles('closet-1', {} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('17) Closet endpoint returns valid SCHEDULED battle', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            makeBattle(MarketplaceBattleStatus.SCHEDULED, {
                startAt: new Date('2026-07-06T11:00:00.000Z'),
                endAt: new Date('2026-07-06T12:00:00.000Z'),
            }),
        ]);

        const result = await service.getClosetPublicBattles('closet-1', {} as any);
        expect(result.battles[0].status).toBe('SCHEDULED');
    });

    it('18) Closet endpoint returns valid LIVE battle', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.LIVE)]);

        const result = await service.getClosetPublicBattles('closet-1', {} as any);
        expect(result.battles[0].status).toBe('LIVE');
    });

    it('19) Closet endpoint returns COMPLETED historical battle', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            makeBattle(MarketplaceBattleStatus.COMPLETED, {
                endAt: new Date('2026-07-06T09:00:00.000Z'),
                completedAt: new Date('2026-07-06T09:00:00.000Z'),
            }),
        ]);

        const result = await service.getClosetPublicBattles('closet-1', {} as any);
        expect(result.battles[0].status).toBe('COMPLETED');
    });

    it('20) Closet endpoint excludes stale expired LIVE/SCHEDULED rows', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: 'closet-1' });
        prisma.marketplaceBattle.count.mockResolvedValue(2);
        prisma.marketplaceBattle.findMany.mockResolvedValue([
            makeBattle(MarketplaceBattleStatus.LIVE, {
                endAt: new Date('2026-07-06T09:59:00.000Z'),
            }),
            makeBattle(MarketplaceBattleStatus.SCHEDULED, {
                startAt: new Date('2026-07-06T09:00:00.000Z'),
                endAt: new Date('2026-07-06T09:30:00.000Z'),
            }),
        ]);

        const result = await service.getClosetPublicBattles('closet-1', {} as any);
        expect(result.battles).toHaveLength(0);
    });

    it('21) Public details returns LIVE battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeBattle(MarketplaceBattleStatus.LIVE));
        const result = await service.getPublicBattleById('battle-1');
        expect(result.status).toBe('LIVE');
    });

    it('22) Public details returns SCHEDULED battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.SCHEDULED, {
                startAt: new Date('2026-07-06T11:00:00.000Z'),
                endAt: new Date('2026-07-06T12:00:00.000Z'),
            }),
        );
        const result = await service.getPublicBattleById('battle-1');
        expect(result.status).toBe('SCHEDULED');
    });

    it('23) Public details returns COMPLETED WINNER battle with winner', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.COMPLETED, {
                outcome: MarketplaceBattleOutcome.WINNER,
                winnerParticipantId: 'p1',
                winnerParticipant: {
                    id: 'p1',
                    product: {
                        id: 'prod-1',
                        name: 'Prod 1',
                        images: ['a.jpg'],
                        price: 10,
                        quantity: 5,
                        category: 'Fashion',
                        brand: 'A',
                        condition: 'New',
                        isActive: true,
                        isDeleted: false,
                    },
                },
            }),
        );
        const result = await service.getPublicBattleById('battle-1');
        expect(result.winner).toBeTruthy();
        expect(result.winner?.participantId).toBe('p1');
    });

    it('24) Public details returns COMPLETED TIE with winner null', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.COMPLETED, {
                outcome: MarketplaceBattleOutcome.TIE,
                winnerParticipant: null,
                winnerParticipantId: null,
            }),
        );
        const result = await service.getPublicBattleById('battle-1');
        expect(result.winner).toBeNull();
    });

    it('25) Public details rejects/hides DRAFT', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeBattle(MarketplaceBattleStatus.DRAFT));
        await expect(service.getPublicBattleById('battle-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('26) Public details rejects/hides CANCELLED', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeBattle(MarketplaceBattleStatus.CANCELLED));
        await expect(service.getPublicBattleById('battle-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('27) Public details rejects stale LIVE battle', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.LIVE, {
                endAt: new Date('2026-07-06T09:59:00.000Z'),
            }),
        );
        await expect(service.getPublicBattleById('battle-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('28) Participants are ordered by position ASC', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.LIVE, {
                participants: [
                    {
                        id: 'p2',
                        position: 2,
                        voteCount: 4,
                        isWinner: false,
                        product: makeBattle(MarketplaceBattleStatus.LIVE).participants[1].product,
                    },
                    {
                        id: 'p1',
                        position: 1,
                        voteCount: 6,
                        isWinner: false,
                        product: makeBattle(MarketplaceBattleStatus.LIVE).participants[0].product,
                    },
                ],
            }),
        );
        const result = await service.getPublicBattleById('battle-1');
        expect(result.participants.map((participant: any) => participant.position)).toEqual([1, 2]);
    });

    it('29) Vote percentages are correct', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.LIVE, {
                totalVotes: 10,
                participants: [
                    {
                        ...makeBattle(MarketplaceBattleStatus.LIVE).participants[0],
                        voteCount: 6,
                    },
                    {
                        ...makeBattle(MarketplaceBattleStatus.LIVE).participants[1],
                        voteCount: 4,
                    },
                ],
            }),
        );

        const result = await service.getPublicBattleById('battle-1');
        expect(result.participants[0].votePercentage).toBe(60);
        expect(result.participants[1].votePercentage).toBe(40);
    });

    it('30) Zero-vote percentages are 0', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.LIVE, {
                totalVotes: 0,
                participants: [
                    {
                        ...makeBattle(MarketplaceBattleStatus.LIVE).participants[0],
                        voteCount: 0,
                    },
                    {
                        ...makeBattle(MarketplaceBattleStatus.LIVE).participants[1],
                        voteCount: 0,
                    },
                ],
            }),
        );

        const result = await service.getPublicBattleById('battle-1');
        expect(result.participants[0].votePercentage).toBe(0);
        expect(result.participants[1].votePercentage).toBe(0);
    });

    it('31) Remaining time never becomes negative', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(
            makeBattle(MarketplaceBattleStatus.COMPLETED, {
                endAt: new Date('2026-07-06T09:00:00.000Z'),
                completedAt: new Date('2026-07-06T09:01:00.000Z'),
            }),
        );

        const result = await service.getPublicBattleById('battle-1');
        expect(result.remainingSeconds).toBeGreaterThanOrEqual(0);
    });

    it('32) Public response does not expose vote/comment collections or private seller fields', async () => {
        prisma.marketplaceBattle.findUnique.mockResolvedValue(makeBattle(MarketplaceBattleStatus.LIVE));
        const result = await service.getPublicBattleById('battle-1');

        expect((result as any).votes).toBeUndefined();
        expect((result as any).comments).toBeUndefined();
        expect((result.seller as any).email).toBeUndefined();
        expect((result.seller as any).phoneNumber).toBeUndefined();
    });

    it('33) Queries avoid N+1 behavior structurally', async () => {
        prisma.marketplaceBattle.count.mockResolvedValue(1);
        prisma.marketplaceBattle.findMany.mockResolvedValue([makeBattle(MarketplaceBattleStatus.LIVE)]);

        await service.explorePublicBattles({} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: expect.objectContaining({
                    participants: expect.any(Object),
                    seller: expect.any(Object),
                    closet: expect.any(Object),
                }),
            }),
        );
    });
});
