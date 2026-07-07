import { NotFoundException } from '@nestjs/common';
import {
    MarketplaceBattleOutcome,
    MarketplaceBattleStatus,
} from '@prisma/client';
import { MarketplaceBattlesService } from './marketplace-battles.service';

describe('MarketplaceBattlesService (Step 10 Winners Carousel)', () => {
    let service: MarketplaceBattlesService;
    let prisma: any;

    const closetId = 'closet-1';
    const otherClosetId = 'closet-2';
    const winnerProductId = 'product-1';

    const makeCompletedWinnerBattle = (overrides: Record<string, any> = {}) => {
        const currentBattleId = overrides.id ?? 'battle-1';

        const base = {
            id: currentBattleId,
            title: 'Summer Style Battle',
            status: MarketplaceBattleStatus.COMPLETED,
            outcome: MarketplaceBattleOutcome.WINNER,
            createdAt: new Date('2026-07-01T09:00:00.000Z'),
            startAt: new Date('2026-07-01T10:00:00.000Z'),
            endAt: new Date('2026-07-01T11:00:00.000Z'),
            completedAt: new Date('2026-07-01T11:00:01.000Z'),
            winnerParticipantId: 'participant-1',
            totalVotes: 100,
            totalComments: 20,
            participants: [
                {
                    id: 'participant-1',
                    battleId: currentBattleId,
                    productId: winnerProductId,
                    position: 1,
                    voteCount: 60,
                    isWinner: true,
                    product: {
                        id: winnerProductId,
                        name: 'Blue Jacket',
                        images: ['p1.jpg'],
                        price: 45,
                        category: 'Fashion',
                        brand: 'Brand A',
                        condition: 'NEW',
                        isActive: true,
                        isDeleted: false,
                    },
                },
                {
                    id: 'participant-2',
                    battleId: currentBattleId,
                    productId: 'product-2',
                    position: 2,
                    voteCount: 40,
                    isWinner: false,
                    product: {
                        id: 'product-2',
                        name: 'Red Jacket',
                        images: ['p2.jpg'],
                        price: 40,
                        category: 'Fashion',
                        brand: 'Brand B',
                        condition: 'NEW',
                        isActive: true,
                        isDeleted: false,
                    },
                },
            ],
            winnerParticipant: {
                id: 'participant-1',
                battleId: currentBattleId,
                product: {
                    id: winnerProductId,
                    name: 'Blue Jacket',
                    images: ['p1.jpg'],
                    price: 45,
                    category: 'Fashion',
                    brand: 'Brand A',
                    condition: 'NEW',
                    isActive: true,
                    isDeleted: false,
                },
            },
        };

        return {
            ...base,
            ...overrides,
            participants: overrides.participants ?? base.participants,
            winnerParticipant: overrides.winnerParticipant ?? base.winnerParticipant,
        };
    };

    beforeEach(() => {
        prisma = {
            mycloset: {
                findUnique: jest.fn(),
            },
            marketplaceBattle: {
                findMany: jest.fn(),
                updateMany: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
        };

        service = new MarketplaceBattlesService(prisma, {
            createInAppNotificationIfAbsent: jest.fn().mockResolvedValue({
                created: true,
                notificationId: 'notif-winners-1',
            }),
        } as any);
    });

    it('1) Existing Closet returns winner products', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([makeCompletedWinnerBattle()])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(1);
        expect(result.winners[0].product.id).toBe(winnerProductId);
    });

    it('2) Missing Closet returns NotFound', async () => {
        prisma.mycloset.findUnique.mockResolvedValue(null);

        await expect(service.getClosetMarketplaceBattleWinners(closetId, {} as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('3) Only COMPLETED battles are considered', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: MarketplaceBattleStatus.COMPLETED }),
            }),
        );
    });

    it('4) Only outcome WINNER is considered', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ outcome: MarketplaceBattleOutcome.WINNER }),
            }),
        );
    });

    it('5) TIE battles are excluded by query', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ outcome: MarketplaceBattleOutcome.WINNER }),
            }),
        );
    });

    it('6) CANCELLED battles are excluded by query', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: MarketplaceBattleStatus.COMPLETED }),
            }),
        );
    });

    it('7) winnerParticipantId null is excluded by query', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ winnerParticipantId: { not: null } }),
            }),
        );
    });

    it('8) completedAt null is excluded by query', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ completedAt: { not: null } }),
            }),
        );
    });

    it('9) Winner belongs to requested Closet battle query scope', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ closetId }) }),
        );
    });

    it('10) Malformed winner relation is skipped and logged', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ winnerParticipant: null }),
                makeCompletedWinnerBattle({ id: 'battle-2', title: 'Valid battle' }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(1);
    });

    it('11) Invalid participant count is skipped', async () => {
        const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ participants: [makeCompletedWinnerBattle().participants[0]] }),
                makeCompletedWinnerBattle({ id: 'battle-2' }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(loggerSpy).toHaveBeenCalled();
        expect(result.winners).toHaveLength(1);
    });

    it('12) Vote sum mismatch is skipped', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ id: 'bad', totalVotes: 101 }),
                makeCompletedWinnerBattle({ id: 'good' }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(1);
    });

    it('13) isWinner mismatch is skipped', async () => {
        const bad = makeCompletedWinnerBattle({ id: 'bad' });
        bad.participants[0].isWinner = false;
        bad.participants[1].isWinner = true;

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([bad, makeCompletedWinnerBattle({ id: 'good' })])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(1);
    });

    it('14) Winner vote count not greater than loser is skipped', async () => {
        const bad = makeCompletedWinnerBattle({ id: 'bad' });
        bad.participants[0].voteCount = 50;
        bad.participants[1].voteCount = 50;
        bad.totalVotes = 100;

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([bad, makeCompletedWinnerBattle({ id: 'good' })])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(1);
    });

    it('15) Same product winning multiple battles is returned once', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ id: 'battle-1' }),
                makeCompletedWinnerBattle({
                    id: 'battle-2',
                    completedAt: new Date('2026-07-05T11:00:01.000Z'),
                    winnerParticipantId: 'participant-1b',
                    participants: [
                        {
                            ...makeCompletedWinnerBattle().participants[0],
                            id: 'participant-1b',
                            battleId: 'battle-2',
                            voteCount: 70,
                        },
                        {
                            ...makeCompletedWinnerBattle().participants[1],
                            id: 'participant-2b',
                            battleId: 'battle-2',
                            voteCount: 30,
                        },
                    ],
                    winnerParticipant: {
                        ...makeCompletedWinnerBattle().winnerParticipant,
                        id: 'participant-1b',
                        battleId: 'battle-2',
                    },
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(1);
    });

    it('16) winCount is correct', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ id: 'battle-1' }),
                makeCompletedWinnerBattle({
                    id: 'battle-2',
                    completedAt: new Date('2026-07-05T11:00:01.000Z'),
                    winnerParticipantId: 'participant-1b',
                    participants: [
                        {
                            ...makeCompletedWinnerBattle().participants[0],
                            id: 'participant-1b',
                            battleId: 'battle-2',
                        },
                        {
                            ...makeCompletedWinnerBattle().participants[1],
                            id: 'participant-2b',
                            battleId: 'battle-2',
                        },
                    ],
                    winnerParticipant: {
                        ...makeCompletedWinnerBattle().winnerParticipant,
                        id: 'participant-1b',
                        battleId: 'battle-2',
                    },
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].winCount).toBe(2);
    });

    it('17) latestWinAt is correct', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ id: 'battle-old' }),
                makeCompletedWinnerBattle({
                    id: 'battle-new',
                    completedAt: new Date('2026-07-10T11:00:01.000Z'),
                    winnerParticipantId: 'participant-1-new',
                    participants: [
                        {
                            ...makeCompletedWinnerBattle().participants[0],
                            id: 'participant-1-new',
                            battleId: 'battle-new',
                        },
                        {
                            ...makeCompletedWinnerBattle().participants[1],
                            id: 'participant-2-new',
                            battleId: 'battle-new',
                        },
                    ],
                    winnerParticipant: {
                        ...makeCompletedWinnerBattle().winnerParticipant,
                        id: 'participant-1-new',
                        battleId: 'battle-new',
                    },
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].latestWinAt.toISOString()).toBe('2026-07-10T11:00:01.000Z');
    });

    it('18) latestBattle is correct', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ id: 'battle-old', title: 'Old' }),
                makeCompletedWinnerBattle({
                    id: 'battle-new',
                    title: 'New',
                    completedAt: new Date('2026-07-10T11:00:01.000Z'),
                    winnerParticipantId: 'participant-1-new',
                    participants: [
                        {
                            ...makeCompletedWinnerBattle().participants[0],
                            id: 'participant-1-new',
                            battleId: 'battle-new',
                        },
                        {
                            ...makeCompletedWinnerBattle().participants[1],
                            id: 'participant-2-new',
                            battleId: 'battle-new',
                        },
                    ],
                    winnerParticipant: {
                        ...makeCompletedWinnerBattle().winnerParticipant,
                        id: 'participant-1-new',
                        battleId: 'battle-new',
                    },
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].latestBattle.id).toBe('battle-new');
        expect(result.winners[0].latestBattle.title).toBe('New');
    });

    it('19) latestVoteCount is correct', async () => {
        const newer = makeCompletedWinnerBattle({
            id: 'battle-new',
            completedAt: new Date('2026-07-10T11:00:01.000Z'),
            winnerParticipantId: 'participant-1-new',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-1-new',
                    battleId: 'battle-new',
                    voteCount: 75,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2-new',
                    battleId: 'battle-new',
                    voteCount: 25,
                },
            ],
            winnerParticipant: {
                ...makeCompletedWinnerBattle().winnerParticipant,
                id: 'participant-1-new',
                battleId: 'battle-new',
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle(), newer]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].latestVoteCount).toBe(75);
    });

    it('20) latestVotePercentage is correct', async () => {
        const newer = makeCompletedWinnerBattle({
            id: 'battle-new',
            completedAt: new Date('2026-07-10T11:00:01.000Z'),
            totalVotes: 3,
            winnerParticipantId: 'participant-1-new',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-1-new',
                    battleId: 'battle-new',
                    voteCount: 2,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2-new',
                    battleId: 'battle-new',
                    voteCount: 1,
                },
            ],
            winnerParticipant: {
                ...makeCompletedWinnerBattle().winnerParticipant,
                id: 'participant-1-new',
                battleId: 'battle-new',
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle(), newer]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].latestVotePercentage).toBe(66.67);
    });

    it('21) totalVotesAcrossWins is correct', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([
                makeCompletedWinnerBattle({ id: 'battle-1', totalVotes: 100 }),
                makeCompletedWinnerBattle({
                    id: 'battle-2',
                    totalVotes: 80,
                    completedAt: new Date('2026-07-02T11:00:01.000Z'),
                    winnerParticipantId: 'participant-1b',
                    participants: [
                        {
                            ...makeCompletedWinnerBattle().participants[0],
                            id: 'participant-1b',
                            battleId: 'battle-2',
                            voteCount: 50,
                        },
                        {
                            ...makeCompletedWinnerBattle().participants[1],
                            id: 'participant-2b',
                            battleId: 'battle-2',
                            voteCount: 30,
                        },
                    ],
                    winnerParticipant: {
                        ...makeCompletedWinnerBattle().winnerParticipant,
                        id: 'participant-1b',
                        battleId: 'battle-2',
                    },
                }),
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].totalVotesAcrossWins).toBe(180);
    });

    it('22) Different winning products are returned separately', async () => {
        const secondWinner = makeCompletedWinnerBattle({
            id: 'battle-2',
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'battle-2',
                    voteCount: 45,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'battle-2',
                    voteCount: 55,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'battle-2',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle(), secondWinner]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(2);
    });

    it('23) Pagination applies to unique valid winning products', async () => {
        const p2 = makeCompletedWinnerBattle({
            id: 'battle-2',
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'battle-2',
                    voteCount: 45,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'battle-2',
                    voteCount: 55,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'battle-2',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle(), p2]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {
            page: 2,
            limit: 1,
        } as any);

        expect(result.winners).toHaveLength(1);
        expect(result.page).toBe(2);
        expect(result.limit).toBe(1);
    });

    it('24) total equals total unique valid winning products', async () => {
        const p2 = makeCompletedWinnerBattle({
            id: 'battle-2',
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'battle-2',
                    voteCount: 45,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'battle-2',
                    voteCount: 55,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'battle-2',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle(), p2]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.total).toBe(2);
    });

    it('25) totalPages is correct', async () => {
        const p2 = makeCompletedWinnerBattle({
            id: 'battle-2',
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'battle-2',
                    voteCount: 45,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'battle-2',
                    voteCount: 55,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'battle-2',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle(), p2]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {
            page: 1,
            limit: 1,
        } as any);

        expect(result.totalPages).toBe(2);
    });

    it('26) Default sorting uses latestWinAt descending', async () => {
        const old = makeCompletedWinnerBattle({ id: 'old', completedAt: new Date('2026-07-01T11:00:01.000Z') });
        const newerProduct = makeCompletedWinnerBattle({
            id: 'new',
            completedAt: new Date('2026-07-02T11:00:01.000Z'),
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'new',
                    voteCount: 45,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'new',
                    voteCount: 55,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'new',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([old, newerProduct]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].latestBattle.id).toBe('new');
    });

    it('27) Explicit ascending sorting works', async () => {
        const old = makeCompletedWinnerBattle({ id: 'old', completedAt: new Date('2026-07-01T11:00:01.000Z') });
        const newerProduct = makeCompletedWinnerBattle({
            id: 'new',
            completedAt: new Date('2026-07-02T11:00:01.000Z'),
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'new',
                    voteCount: 45,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'new',
                    voteCount: 55,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'new',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([old, newerProduct]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {
            sortBy: 'completedAt',
            sortOrder: 'asc',
        } as any);

        expect(result.winners[0].latestBattle.id).toBe('old');
    });

    it('28) totalVotesAcrossWins sorting works', async () => {
        const p1High = makeCompletedWinnerBattle({
            totalVotes: 200,
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    voteCount: 120,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    voteCount: 80,
                },
            ],
        });
        const p2Low = makeCompletedWinnerBattle({
            id: 'battle-2',
            totalVotes: 50,
            winnerParticipantId: 'participant-2',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-a',
                    battleId: 'battle-2',
                    voteCount: 20,
                    isWinner: false,
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2',
                    battleId: 'battle-2',
                    voteCount: 30,
                    isWinner: true,
                },
            ],
            winnerParticipant: {
                id: 'participant-2',
                battleId: 'battle-2',
                product: {
                    ...makeCompletedWinnerBattle().participants[1].product,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([p1High, p2Low]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {
            sortBy: 'totalVotes',
            sortOrder: 'desc',
        } as any);

        expect(result.winners[0].totalVotesAcrossWins).toBe(200);
    });

    it('29) Public response does not expose vote/comment rows', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle()]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect((result.winners[0] as any).votes).toBeUndefined();
        expect((result.winners[0] as any).comments).toBeUndefined();
        expect((result.winners[0].latestBattle as any).votes).toBeUndefined();
        expect((result.winners[0].latestBattle as any).comments).toBeUndefined();
    });

    it('30) Public response does not expose private seller fields', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle()]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect((result.winners[0] as any).seller).toBeUndefined();
        expect((result.winners[0].product as any).userId).toBeUndefined();
    });

    it('31) Endpoint performs no database writes', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle()]).mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.updateMany).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.create).not.toHaveBeenCalled();
        expect(prisma.marketplaceBattle.deleteMany).not.toHaveBeenCalled();
    });

    it('32) Query avoids N+1 behavior structurally', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([makeCompletedWinnerBattle()]).mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        const args = prisma.marketplaceBattle.findMany.mock.calls[0][0];
        expect(args.select).toEqual(
            expect.objectContaining({
                participants: expect.any(Object),
                winnerParticipant: expect.any(Object),
            }),
        );
        expect(args.select.votes).toBeUndefined();
        expect(args.select.comments).toBeUndefined();
    });

    it('33) Product-history limitation uses current related product data (no snapshot)', async () => {
        const latest = makeCompletedWinnerBattle({
            id: 'battle-new',
            completedAt: new Date('2026-07-10T11:00:01.000Z'),
            winnerParticipantId: 'participant-1-new',
            participants: [
                {
                    ...makeCompletedWinnerBattle().participants[0],
                    id: 'participant-1-new',
                    battleId: 'battle-new',
                    product: {
                        ...makeCompletedWinnerBattle().participants[0].product,
                        name: 'Blue Jacket v2',
                        price: 50,
                    },
                },
                {
                    ...makeCompletedWinnerBattle().participants[1],
                    id: 'participant-2-new',
                    battleId: 'battle-new',
                },
            ],
            winnerParticipant: {
                ...makeCompletedWinnerBattle().winnerParticipant,
                id: 'participant-1-new',
                battleId: 'battle-new',
                product: {
                    ...makeCompletedWinnerBattle().winnerParticipant.product,
                    name: 'Blue Jacket v2',
                    price: 50,
                },
            },
        });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([latest]).mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners[0].product.name).toBe('Blue Jacket v2');
        expect(result.winners[0].product.price).toBe(50);
    });

    it('uses chunked fetches for bounded processing', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([makeCompletedWinnerBattle({ id: 'battle-1' })])
            .mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 100 }),
        );
    });

    it('returns empty result when no valid winners exist after integrity filtering', async () => {
        const invalid = makeCompletedWinnerBattle({ participants: [makeCompletedWinnerBattle().participants[0]] });

        prisma.mycloset.findUnique.mockResolvedValue({ id: closetId });
        prisma.marketplaceBattle.findMany
            .mockResolvedValueOnce([invalid])
            .mockResolvedValueOnce([]);

        const result = await service.getClosetMarketplaceBattleWinners(closetId, {} as any);

        expect(result.winners).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.totalPages).toBe(0);
    });

    it('closet scope does not leak other closet ids', async () => {
        prisma.mycloset.findUnique.mockResolvedValue({ id: otherClosetId });
        prisma.marketplaceBattle.findMany.mockResolvedValueOnce([]);

        await service.getClosetMarketplaceBattleWinners(otherClosetId, {} as any);

        expect(prisma.marketplaceBattle.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ closetId: otherClosetId }) }),
        );
    });
});
